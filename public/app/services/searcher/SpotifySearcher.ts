module consensus {
  export class SpotifySearcher implements Searcher<Array<spotify.Track>> {
    static $inject = ['$http'];

    constructor(private $http:angular.IHttpService) {
    }

    public search(query:string):angular.IPromise<Array<spotify.Track>> {
      var spotifyOpts = {
        params: {
          limit: 20,
          type: 'track',
          q: query
        }
      };
      return this.$http.get('https://api.spotify.com/v1/search', spotifyOpts)
        .then((response:angular.IHttpPromiseCallbackArg<spotify.TrackSearchResult>) => {
          return _.filter(response.data.tracks.items, (track) => _.contains(track.available_markets, 'US'));
        });
    }
  }
}
