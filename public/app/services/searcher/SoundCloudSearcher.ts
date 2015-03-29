module consensus {
  export class SoundCloudSearcher implements Searcher<Array<soundcloud.Track>> {
    static $inject = ['$http', 'soundcloudConfig'];

    constructor(private $http:angular.IHttpService, private soundcloudConfig:SoundCloudConfig) {
    }

    public search(query:string):angular.IPromise<Array<soundcloud.Track>> {
      var soundCloudOpts = {
        params: {
          client_id: this.soundcloudConfig.clientId,
          limit: this.soundcloudConfig.limit,
          q: query
        }
      };

      return this.$http.get('http://api.soundcloud.com/tracks', soundCloudOpts)
        .then((response:angular.IHttpPromiseCallbackArg<Array<soundcloud.Track>>) => {
          return _.filter(response.data, (track) => track.streamable);
        });
    }
  }
}
