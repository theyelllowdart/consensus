import searcher = require('Searcher');

export class SpotifySearcher implements searcher.Searcher<Array<spotify.Track>> {
  static $inject = ['$http'];

  constructor(private $http:angular.IHttpService) {
  }

  public search(query:string):angular.IPromise<Array<spotify.Track>> {
    var spotifyOpts = {
      params: {
        limit: 20,
        type: 'track',
        market: 'US',
        q: query
      }
    };
    return this.$http.get('https://api.spotify.com/v1/search', spotifyOpts)
      .then((response:angular.IHttpPromiseCallbackArg<spotify.TrackSearchResult>) => {
        return response.data.tracks.items;
      });
  }
}
