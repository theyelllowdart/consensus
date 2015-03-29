module consensus {
  export class SyncSearcher<TSearchResult, TSearcher extends Searcher<any>> {
    private seed:number = 0;
    private resultSeed:number = 0;

    static $inject = ['$q'];

    constructor(private $q:angular.IQService, private searcher:TSearcher) {
    }

    public search(query:string):angular.IPromise<TSearchResult> {
      var currentSeed = ++this.seed;

      return this.searcher.search(query)
        .then((response) => {
          if (currentSeed >= this.resultSeed) {
            this.resultSeed = currentSeed;
            return response
          } else {
            this.$q.reject();
          }
        });
    }
  }

  export class SyncedSoundCloudSearcher extends SyncSearcher<Array<soundcloud.Track>, SoundCloudSearcher> {
    static $inject = ['$q', 'soundcloudSearcher'];
    constructor($q:angular.IQService, searcher:SoundCloudSearcher) {
      super($q, searcher)
    }
  }

  export class SyncedYouTubeSearcher extends SyncSearcher<Array<GoogleApiYouTubeSearchResource>, YouTubeSearcher> {
    static $inject = ['$q', 'youtubeSearcher'];
    constructor($q:angular.IQService, searcher:YouTubeSearcher) {
      super($q, searcher)
    }
  }

  export class SyncedSpotifySearcher extends SyncSearcher<Array<spotify.Track>, SpotifySearcher> {
    static $inject = ['$q', 'spotifySearcher'];
    constructor($q:angular.IQService, searcher:SpotifySearcher) {
      super($q, searcher)
    }
  }
}
