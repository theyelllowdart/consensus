import searcher = require('Searcher');

export class SoundCloudConfig {
  constructor(public clientId:string, public limit:number) {
  }
}

export class SoundCloudSearcher implements searcher.Searcher<Array<soundcloud.Track>> {
  static $inject = ['$http', 'soundcloudConfig'];

  constructor(private $http:angular.IHttpService, private soundcloudConfig:SoundCloudConfig) {
  }

  public search(query:string):angular.IPromise<Array<soundcloud.Track>> {
    var soundCloudOpts = {
      params: {
        client_id: this.soundcloudConfig.clientId,
        limit: this.soundcloudConfig.limit,
        filter: 'streamable',
        q: query
      }
    };

    return this.$http.get('https://api.soundcloud.com/tracks', soundCloudOpts)
      .then((response:angular.IHttpPromiseCallbackArg<Array<soundcloud.Track>>) => {
        return _.filter(response.data, (track) => track && track.stream_url);
      });
  }
}
