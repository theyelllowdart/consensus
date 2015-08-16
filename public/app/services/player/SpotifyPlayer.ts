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
  private spotifyPlayerElem:HTMLElement;
  private spotifyReadyPromise:angular.IPromise<any>;
  private spotifyProgressTimer:angular.IPromise<any>;

  static $inject = ['playState', '$timeout', '$interval', '$q', 'spotifyIFrameId', 'syncedTime'];

  constructor(private playState:player.PlayerState,
              private $timeout:angular.ITimeoutService,
              private $interval:angular.IIntervalService,
              $q:angular.IQService,
              spotifyIFrameId:string,
              private syncedTime:syncedTime.SyncedTime) {
    var spotifyReadyDefer = $q.defer();
    this.spotifyPlayerElem = angular.element("#" + spotifyIFrameId)[0];
    this.spotifyPlayerElem.addEventListener('spotifyRemote.ready', () => spotifyReadyDefer.resolve());
    this.spotifyReadyPromise = spotifyReadyDefer.promise;
  }

  public play(playCounter:number, uri:string, start:number, duration:number):void {
    this.spotifyReadyPromise.then(()=> {
      this.$timeout(() => this.playState.ifCurrent(playCounter, () => {
        var evt = StandardsCustomEvent.get("spotifyRemote.play", {detail: uri + '#0:00'});
        this.spotifyPlayerElem.dispatchEvent(evt);
        this.spotifyProgressTimer = this.$interval(() => this.playState.ifCurrent(playCounter, () => {
          var progressPercent = (this.syncedTime.now() - start) / duration;
          this.playState.progress = Math.min(Math.floor(progressPercent * 100), 100);
        }), 500)
      }), start - this.syncedTime.now(), false);
    });
  }

  public stop():void {
    var evt = StandardsCustomEvent.get("spotifyRemote.pause", {detail: {}});
    this.spotifyPlayerElem.dispatchEvent(evt);
    this.$interval.cancel(this.spotifyProgressTimer);
  }
}
