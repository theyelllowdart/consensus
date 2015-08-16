import searcher = require('Searcher');
import soundCloudSearcher = require('SoundCloudSearcher');
import youtubeSearcher = require('YouTubeSearcher');
import spotifySearcher = require('SpotifySearcher');

export class SyncSearcher<TSearchResult, TSearcher extends searcher.Searcher<any>> {
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

export class SyncedSoundCloudSearcher extends SyncSearcher<Array<soundcloud.Track>, soundCloudSearcher.SoundCloudSearcher> {
  static $inject = ['$q', 'soundcloudSearcher'];
  constructor($q:angular.IQService, s:soundCloudSearcher.SoundCloudSearcher) {
    super($q, s)
  }
}

export class SyncedYouTubeSearcher extends SyncSearcher<Array<GoogleApiYouTubeSearchResource>, youtubeSearcher.YouTubeSearcher> {
  static $inject = ['$q', 'youtubeSearcher'];
  constructor($q:angular.IQService, s:youtubeSearcher.YouTubeSearcher) {
    super($q, s)
  }
}

export class SyncedSpotifySearcher extends SyncSearcher<Array<spotify.Track>, spotifySearcher.SpotifySearcher> {
  static $inject = ['$q', 'spotifySearcher'];
  constructor($q:angular.IQService, s:spotifySearcher.SpotifySearcher) {
    super($q, s)
  }
}
