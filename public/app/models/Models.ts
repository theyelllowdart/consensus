export enum Source{
  SOUND_CLOUD,
  YOUTUBE,
  SPOTIFY
}

export class Song {
  public constructor(public id:string,
                     public creator:string,
                     public url:string,
                     public duration:number,
                     public source:Source,
                     public name:string,
                     public trackLink:string,
                     public artwork:string,
                     public subtitle:string,
                     public upvotes:Array<string>,
                     public downvotes:Array<string>,
                     public scheduled:number,
                     public start?:number) {
  }
}

export class SongRequest {
  public constructor(public url:string,
                     public duration:number,
                     public source:Source,
                     public name:string,
                     public trackLink:string,
                     public artwork:string,
                     public subtitle:string) {
  }
}
