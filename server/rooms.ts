/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../public/app/Models/Models.ts' />

var _ = require('lodash');
var uuid = require('node-uuid');
import consensus = require("../public/app/Models/Models");

export function setup(io:SocketIO.Server, db:any) {
  var songQueues = {};

  io.on('connection', function (socket) {
    var user = socket.request.user;
    console.log('user ' + user + ' connected');
    var room = socket.request._query.room;
    socket.join(room);
    if (!songQueues[room]) {
      songQueues[room] = new SongQueue((songs:Array<consensus.Song>) => io.sockets.to(room).emit('queueChange', songs));
    }
    var songQueue:SongQueue = songQueues[room];
    socket.on('disconnect', function () {
      console.log('user ' + user + ' disconnected');
    });
    socket.on('time', function (data) {
      data.serverTime = Date.now();
      socket.emit("time", data)
    });
    socket.on('enqueue', function (songRequest:consensus.SongRequest) {
      var id = uuid.v1();
      var song = new consensus.Song(id, user, songRequest.url, songRequest.duration, songRequest.source,
        songRequest.name, songRequest.trackLink, songRequest.artwork, songRequest.subtitle, [user], [], Date.now());
      db.query(
        'INSERT into Song (id, creator, url, duration, source, name, upvotes, downvotes, scheduled) ' +
        'VALUES($1, $2, $3, $4, $5, $6, $7, $8::varchar[], $9)',
        [song.id, song.creator, song.url, song.duration, song.source, song.name, song.upvotes, song.downvotes, new Date(song.scheduled)]
      ).then(() => {
        },
        (reason) => {
          console.error(reason);
        });
      songQueue.add(song);
    });
    socket.on('upvote', function (id) {
      songQueue.upvote(id, user);
    });
    socket.on('downvote', function (id) {
      songQueue.downvote(id, user);
    });
    socket.on('status', function () {
      socket.emit('queueChange', songQueue.songs);
    });
  });
}

class SongQueue {
  public songs:Array<consensus.Song> = [];
  private delaySongDuration:number = 1000;
  private playTimeout:any;
  private notifyQueueChange:() => void;

  constructor(notifyQueueChange:(songs:Array<consensus.Song>)=>void) {
    this.notifyQueueChange = () => notifyQueueChange(this.songs)
  }

  public add(song:consensus.Song) {
    this.songs.push(song);
    if (this.songs.length === 1) {
      this.play();
    }
    this.notifyQueueChange();
  }

  private play():void {
    clearTimeout(this.playTimeout);
    var song = _.first(this.songs);
    if (song) {
      song.start = Date.now() + this.delaySongDuration;
      this.playTimeout = setTimeout(() => {
        this.songs.shift();
        this.play();
        this.notifyQueueChange();
      }, song.duration + (this.delaySongDuration * 2));
    }
  }

  public upvote(id:string, user:string):void {
    this.vote(id, user, (song:consensus.Song) => song.upvotes, (song:consensus.Song) => song.downvotes);
  }

  public downvote(id:string, user:string):void {
    this.vote(id, user, (song:consensus.Song) => song.downvotes, (song:consensus.Song) => song.upvotes);
  }

  private vote(id:string,
               user:string,
               getSameVotes:(song:consensus.Song) => Array<string>,
               getOppositeVotes:(song:consensus.Song) => Array<string>):any {
    var index = _.findIndex(this.songs, function (song) {
      return song.id === id;
    });
    if (index === -1) return false;
    var song = this.songs[index];
    _.remove(getOppositeVotes(song), function (voter) {
      return voter === user;
    });
    var nullifiedVote = _.remove(getSameVotes(song), function (voter) {
      return voter === user;
    });

    if (nullifiedVote.length === 0) {
      getSameVotes(song).push(user);
    }
    if (song.downvotes.length >= song.upvotes.length && (song.downvotes.length > 0 || song.upvotes.length > 0)) {
      this.songs.splice(index, 1);
      if (index === 0) {
        this.play();
      }
    }
    this.notifyQueueChange();
  }
}
