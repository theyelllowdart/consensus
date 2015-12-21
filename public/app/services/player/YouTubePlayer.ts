import player = require('Player');
import syncedTime = require('SyncedTime');

class YTOnStateHandlerWrapper {
  public handler:YT.EventHandler = (event:YT.EventArgs) => {
  };

  call = (event:YT.EventArgs):void => {
    this.handler(event);
  }
}

export class YouTubePlayer implements player.Player {
  private youtubeProgressPromise:angular.IPromise<any>;
  private ytWrapper:YTOnStateHandlerWrapper = new YTOnStateHandlerWrapper();

  static $inject = ['playState', '$timeout', '$interval', 'syncedTime', 'ytPlayerPromise'];

  constructor(private playState:player.PlayerState,
              private $timeout:angular.ITimeoutService,
              private $interval:angular.IIntervalService,
              private goTimeService:syncedTime.SyncedTime,
              private ytPlayerPromise:angular.IPromise<YT.Player>) {
    this.ytPlayerPromise.then((ytPlayer) => {
      ytPlayer.addEventListener('onStateChange', this.ytWrapper.call)
    });
  }

  public stop():void {
    this.ytPlayerPromise.then((player:YT.Player) => player.stopVideo());
    this.$interval.cancel(this.youtubeProgressPromise);
  }

  public play(playCounter:number, url:string, start:number, duration:number):void {
    this.ytPlayerPromise.then((ytPlayer) => this.playState.ifCurrent(playCounter, () => {
      var buffered = false;
      this.ytWrapper.handler = (event:YT.EventArgs) => this.playState.ifCurrent(playCounter, () => {
        if (event.data == YT.PlayerState.PLAYING && !buffered) {
          buffered = true;
          event.target.stopVideo();
          var sleepDuration = start - this.goTimeService.now();
          this.$timeout(() => this.playState.ifCurrent(playCounter, () => {
            var seek = start - this.goTimeService.now();
            event.target.seekTo(Math.abs(seek / 1000), true);
            event.target.playVideo();
            this.youtubeProgressPromise = this.$interval(() => {
              this.playState.progress = Math.min(100, ytPlayer.getCurrentTime() / ytPlayer.getDuration() * 100);
            }, 500)
          }), sleepDuration, false)
        } else if (event.data == YT.PlayerState.ENDED) {
          this.$interval.cancel(this.youtubeProgressPromise);
          this.playState.progress = 100;
        }
      });
      ytPlayer.loadVideoById(url);
    }));
  }
}
