module consensus {
  export class SoundCloudPlayer implements Player {

    static $inject = ['playState', '$timeout', '$rootScope', 'syncedTime', 'SC', 'soundManager'];

    constructor(private playState:PlayerState,
                private $timeout:angular.ITimeoutService,
                private $rootScope:angular.IRootScopeService,
                private syncedTime:SyncedTime,
                private SC:any,
                private soundManager:any) {
    }

    public stop():void {
      this.soundManager.stopAll();
    }

    public play(currentRequest:number, url:string, start:number, duration:number) {
      this.SC.stream(url, (soundObject) => this.playState.ifCurrent(currentRequest, () => {
        soundObject.load();
        var sleepDuration = start - this.syncedTime.now();
        if (sleepDuration < 0) {
          soundObject.setPosition(-sleepDuration);
        }
        this.$timeout(() => this.playState.ifCurrent(currentRequest, () => {
          soundObject.play({
            onstop: soundObject.destruct,
            onfinish: () => {
              soundObject.destruct();
              this.$rootScope.$apply(()=> {
                this.playState.progress = 100;
              });
            },
            whileplaying: () => {
              this.$rootScope.$apply(()=> {
                this.playState.progress = Math.floor((soundObject.position / duration) * 100);
              });
            }
          });
        }), sleepDuration, false);
      }));
    }
  }
}
