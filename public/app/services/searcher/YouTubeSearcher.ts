import searcher = require('Searcher');

export class YoutubeConfig {
  constructor(public apiKey:string) {
  }
}

export class YouTubeSearcher implements searcher.Searcher<Array<GoogleApiYouTubeSearchResource>> {
  static $inject = ['$http', 'youtubeConfig'];

  constructor(private $http:angular.IHttpService, private youtubeConfig:YoutubeConfig) {
  }

  public search(query:string):angular.IPromise<Array<GoogleApiYouTubeSearchResource>> {
    var youtubeOpts = {
      params: {
        key: this.youtubeConfig.apiKey,
        maxResults: 20,
        part: 'snippet',
        q: query,
        fields: 'items(id,snippet)',
        type: 'video'
      }
    };
    return this.$http.get('https://www.googleapis.com/youtube/v3/search', youtubeOpts)
      .then((response:angular.IHttpPromiseCallbackArg<GoogleApiYouTubePageInfo<GoogleApiYouTubeSearchResource>>) => {
        return response.data.items;
      });
  }
}
