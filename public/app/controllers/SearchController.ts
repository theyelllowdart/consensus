module consensus {
  class SearchCtx {
    term:string;
  }

  export class SearchController {
    private searchCtx:SearchCtx = new SearchCtx();
    private connectedSocket:angular.IPromise<SocketIOClient.Socket>;

    public soundCloudResults:Array<soundcloud.Track> = [];
    public youtubeResults:Array<GoogleApiYouTubeSearchResource> = [];
    public spotifyResults:Array<spotify.Track> = [];

    public static $inject = [
      '$scope',
      '$http',
      'socket',
      'uuidGenerator',
      'youtubeConfig',
      'syncedSoundCloudSearcher',
      'syncedYouTubeSearcher',
      'syncedSpotifySearcher'
    ];

    constructor(private $scope:angular.IScope,
                private $http:angular.IHttpService,
                socket:Socket,
                private uuidGenerator:UUIDGenerator,
                private youtubeConfig:YoutubeConfig,
                private soundcloudSearcher:SyncedSoundCloudSearcher,
                private youtubeSearcher:SyncedYouTubeSearcher,
                private spotifySearch:SyncedSpotifySearcher) {
      this.connectedSocket = socket.connected();
    }

    public enqueueSC(resource:soundcloud.Resource) {
      var newSong = new Song(
        this.uuidGenerator.generate(),
        resource.stream_url,
        resource.duration,
        Source.SOUND_CLOUD,
        resource.title,
        resource.permalink_url,
        (resource.artwork_url || resource.user.avatar_url),
        resource.user.username
      );
      this.connectedSocket.then((socket) => socket.emit('enqueue', newSong));
    }

    public enqueueYT(resource:GoogleApiYouTubeSearchResource) {
      var youtubeOpts = {
        params: {
          key: this.youtubeConfig.apiKey,
          part: 'contentDetails',
          id: resource.id.videoId
        }
      };
      this.$http.get('https://www.googleapis.com/youtube/v3/videos', youtubeOpts).success((response:any) => {
        var duration = response.items[0].contentDetails.duration;
        var durationMillis = moment.duration(duration).asMilliseconds();
        var newSong = new Song(
          this.uuidGenerator.generate(),
          resource.id.videoId,
          durationMillis,
          Source.YOUTUBE,
          resource.snippet.title,
          '//youtube.com/watch?v=' + resource.id.videoId,
          resource.snippet.thumbnails['default'].url,
          resource.snippet.channelTitle
        );
        this.connectedSocket.then((socket) => socket.emit('enqueue', newSong));
      })
    }

    public enqueueSpotify(track:spotify.Track) {
      var newSong = new Song(
        this.uuidGenerator.generate(),
        track.uri,
        track.duration_ms,
        Source.SPOTIFY,
        track.artists[0].name + ' - ' + track.name,
        track.external_urls.spotify,
        track.album.images[1].url,
        track.album.name
      );
      this.connectedSocket.then((socket) => socket.emit('enqueue', newSong));
    }

    // getter/setter
    public search(newTerm?:string) {
      if (angular.isDefined(newTerm)) {
        this.searchCtx.term = newTerm;
        if (newTerm === '') {
          this.soundCloudResults = [];
          this.youtubeResults = [];
          this.spotifyResults = [];
        } else {
          this.performSearch(newTerm);
        }
      }
      return this.searchCtx.term;
    }

    private performSearch(newQuery:string) {
      this.soundcloudSearcher.search(newQuery).then((results:Array<soundcloud.Track>) => {
        if (this.searchCtx.term !== '') this.soundCloudResults = results;
      });
      this.youtubeSearcher.search(newQuery).then((results:Array<GoogleApiYouTubeSearchResource>) => {
        if (this.searchCtx.term !== '') this.youtubeResults = results;
      });
      this.spotifySearch.search(newQuery).then((results:Array<spotify.Track>) => {
        if (this.searchCtx.term !== '') this.spotifyResults = results
      });
    }
  }
}
