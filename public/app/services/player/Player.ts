export class PlayerState {
  private counter:number = 0;
  public progress:number = 0;

  constructor() {
  }

  public getCounter() {
    return this.counter;
  }

  public incrementCounter() {
    return ++this.counter;
  }

  public ifCurrent(playCounter:number, fn:() => any) {
    if (playCounter === this.counter)
      return fn();
    else
      return false;
  }
}

export interface Player {
  stop():void;
  play(playCounter:number, url:string, start:number, duration:number):void;
}
