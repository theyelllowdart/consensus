import models = require('../models/Models');
import socket = require('../services/Socket');
import syncedTime = require('../services/SyncedTime');
import player = require('../services/player/Player');
import timedPlayer = require('../services/player/TimedPlayer');
import youtubePlayer = require('../services/player/YouTubePlayer');
import soundcloudPlayer = require('../services/player/SoundCloudPlayer');
import spotifyPlayer = require('../services/player/SpotifyPlayer');

class ListenState {
  public listening:boolean = false;

  constructor(listening:boolean) {
    this.listening = listening;
  }
}

export class QueueController {
  private connectedSocket:angular.IPromise<SocketIOClient.Socket>;
  public queue:Array<models.Song> = [];
  public state:ListenState;

  public static $inject = [
    '$scope',
    'ipCookie',
    'socket',
    'syncedTime',
    'youtubePlayer',
    'spotifyPlayer',
    'soundcloudPlayer',
    'timedPlayer',
    'playState'
  ];

  constructor(private $scope:angular.IScope,
              private ipCookie:any,
              socketService:socket.Socket,
              syncedTime:syncedTime.SyncedTime,
              private youtubePlayer:youtubePlayer.YouTubePlayer,
              private spotifyPlayer:spotifyPlayer.SpotifyPlayer,
              private soundcloudPlayer:soundcloudPlayer.SoundCloudPlayer,
              private timedPlayer:timedPlayer.TimedPlayer,
              private playState:player.PlayerState) {
    this.state = new ListenState(!!ipCookie('listening'));
    this.connectedSocket = socketService.connected();
    syncedTime.whenSynced().then(() => {
      this.addQueueChangeListener();
    });
  }

  private stopAll() {
    this.soundcloudPlayer.stop();
    this.youtubePlayer.stop();
    if (this.state.listening) {
      this.spotifyPlayer.stop();
    }
    this.timedPlayer.stop();
  }

  private addQueueChangeListener():void {
    this.connectedSocket.then((socket:SocketIOClient.Socket) => {
      socket.on('queueChange', (newQueue:Array<models.Song>) => {
        if (newQueue.length > 0) {
          if (this.queue.length === 0 || this.queue[0].id !== newQueue[0].id) {
            this.playState.incrementCounter();
            this.stopAll();
            this.$scope.$apply(() => this.playState.progress = 0);
            this.play(this.playState.getCounter(), newQueue[0]);
          }
        } else {
          this.playState.incrementCounter();
          this.stopAll();
          this.$scope.$apply(() => this.playState.progress = 0);
        }
        this.$scope.$apply(() => {
          this.queue = newQueue;
        });
      });
      socket.emit('status', {});
    });
  }

  private play(playCounter:number, song:models.Song):void {
    var player:player.Player = null;
    if (this.state.listening == true) {
      if (song.source === models.Source.SOUND_CLOUD) {
        player = this.soundcloudPlayer;
      } else if (song.source === models.Source.YOUTUBE) {
        player = this.youtubePlayer;
      } else if (song.source === models.Source.SPOTIFY) {
        player = this.spotifyPlayer;
      }
    } else {
      player = this.timedPlayer;
    }
    player.play(playCounter, song.url, song.start, song.duration);
  }

  public downvote(id:string):void {
    this.connectedSocket.then((socket:SocketIOClient.Socket) => socket.emit('downvote', id));
  }

  public upvote(id:string):void {
    this.connectedSocket.then((socket:SocketIOClient.Socket) => socket.emit('upvote', id));
  }

  public listen():void {
    this.ipCookie('listening', this.state.listening, {
      expires: 365,
      path: '/'
    });
    this.playState.incrementCounter();
    this.stopAll();
    if (this.queue.length > 0) {
      this.play(this.playState.getCounter(), this.queue[0]);
    }
  }
}
