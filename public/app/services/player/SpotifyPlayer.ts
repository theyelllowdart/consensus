import player = require('Player');
import syncedTime = require('SyncedTime');

class StandardsCustomEvent {
  static get(eventType:string, data:{}) {
    var customEvent = <any>CustomEvent;
    var event = new customEvent(eventType, data);
    return <CustomEvent> event;
  }
}

export class SpotifyPlayer implements player.Player {
  private spotifyRemoteElem:HTMLElement;
  private spotifyReadyPromise:angular.IPromise<any>;
  private spotifyProgressTimer:angular.IPromise<any>;

  static $inject = ['playState', '$timeout', '$interval', '$q', 'spotifyRemoteId', 'syncedTime'];

  constructor(private playState:player.PlayerState,
              private $timeout:angular.ITimeoutService,
              private $interval:angular.IIntervalService,
              $q:angular.IQService,
              spotifyRemoteId:string,
              private syncedTime:syncedTime.SyncedTime) {
    var spotifyReadyDefer = $q.defer();

    this.spotifyRemoteElem = angular.element("#" + spotifyRemoteId)[0];

    this.spotifyRemoteElem.addEventListener('spotifyConsumer.handshake', () => {
      spotifyReadyDefer.resolve();
    });

    var initiateHandshake = () => {
      var evt = StandardsCustomEvent.get("spotifyRemote.handshake", {detail: {}});
      this.spotifyRemoteElem.dispatchEvent(evt);
    };

    // It's unclear whether the chrome extension will load first or this constructor will be called.
    initiateHandshake();
    this.spotifyRemoteElem.addEventListener('spotifyRemote.ready', () => {
      initiateHandshake();
    });

    this.spotifyReadyPromise = spotifyReadyDefer.promise;
  }

  public play(playCounter:number, uri:string, start:number, duration:number):void {
    this.spotifyReadyPromise.then(() => {
      this.$timeout(() => this.playState.ifCurrent(playCounter, () => {
        var evt = StandardsCustomEvent.get("spotifyRemote.play", {detail: uri + '#0:00'});
        this.spotifyRemoteElem.dispatchEvent(evt);
        this.spotifyProgressTimer = this.$interval(() => this.playState.ifCurrent(playCounter, () => {
          this.playState.progress = Math.min(100, (this.syncedTime.now() - start) / duration * 100);
        }), 500)
      }), start - this.syncedTime.now(), false);
    });
  }

  public stop():void {
    this.spotifyReadyPromise.then(() => {
      var evt = StandardsCustomEvent.get("spotifyRemote.pause", {detail: {}});
      this.spotifyRemoteElem.dispatchEvent(evt);
      this.$interval.cancel(this.spotifyProgressTimer);
    });
  }
}
