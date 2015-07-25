module consensus {
  class ListenState {
    public listening:boolean = false;

    constructor(listening:boolean) {
      this.listening = listening;
    }
  }

  export class QueueController {
    private connectedSocket:angular.IPromise<SocketIOClient.Socket>;
    public queue:Array<Song> = [];
    public state:ListenState;

    public static $inject = [
      '$scope',
      '$cookies',
      'socket',
      'syncedTime',
      'youtubePlayer',
      'spotifyPlayer',
      'soundcloudPlayer',
      'timedPlayer',
      'playState'
    ];

    constructor(private $scope:angular.IScope,
                private $cookies:angular.cookies.ICookieStoreService,
                socketService:Socket,
                syncedTime:SyncedTime,
                private youtubePlayer:YouTubePlayer,
                private spotifyPlayer:SpotifyPlayer,
                private soundcloudPlayer:SoundCloudPlayer,
                private timedPlayer:TimedPlayer,
                private playState:PlayerState) {
      this.state = new ListenState($cookies.get('listening') === 'true');
      this.connectedSocket = socketService.connected();
      syncedTime.whenSynced().then(() => {
        this.addQueueChangeListener();
        this.status();
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
      this.connectedSocket.then((socket:SocketIOClient.Socket) => socket.on('queueChange', (newQueue:Array<Song>) => {
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
      }));
    }

    private play(playCounter:number, song:Song):void {
      var player:Player = null;
      if (this.state.listening == true) {
        if (song.source === Source.SOUND_CLOUD) {
          player = this.soundcloudPlayer;
        } else if (song.source === Source.YOUTUBE) {
          player = this.youtubePlayer;
        } else if (song.source === Source.SPOTIFY) {
          player = this.spotifyPlayer;
        }
      } else {
        player = this.timedPlayer;
      }
      player.play(playCounter, song.url, song.start, song.duration);
    }

    public status():void {
      this.connectedSocket.then((socket:SocketIOClient.Socket) => socket.emit('status', {}));
    }

    public clear():void {
      this.connectedSocket.then((socket:SocketIOClient.Socket) => socket.emit('clear'));
    }

    public downvote(id:string):void {
      this.connectedSocket.then((socket:SocketIOClient.Socket) => socket.emit('downvote', id));
    }

    public upvote(id:string):void {
      this.connectedSocket.then((socket:SocketIOClient.Socket) => socket.emit('upvote', id));
    }

    public listen():void {
      (<any> this.$cookies).put('listening', this.state.listening, {expires: moment().add(1, 'year').toDate()});
      this.playState.incrementCounter();
      this.stopAll();
      if (this.queue.length > 0) {
        this.play(this.playState.getCounter(), this.queue[0]);
      }
    }
  }
}
