/// <reference path="../../typings/tsd.d.ts"/>

/// <reference path="models/Song.ts"/>

/// <reference path="services/UUIDGenerator.ts"/>
/// <reference path="services/Socket.ts"/>
/// <reference path="services/SyncedTime.ts"/>

/// <reference path="services/player/Player.ts"/>
/// <reference path="services/player/SoundCloudPlayer.ts"/>
/// <reference path="services/player/SpotifyPlayer.ts"/>
/// <reference path="services/player/TimedPlayer.ts"/>
/// <reference path="services/player/YouTubePlayer.ts"/>

/// <reference path="services/searcher/Searcher.ts"/>
/// <reference path="services/searcher/SoundCloudSearcher.ts"/>
/// <reference path="services/searcher/SyncSearcher.ts"/>
/// <reference path="services/searcher/SpotifySearcher.ts"/>
/// <reference path="services/searcher/YouTubeSearcher.ts"/>

/// <reference path="controllers/QueueController.ts"/>
/// <reference path="controllers/SearchController.ts"/>


module consensus {
  export class SoundCloudConfig {
    constructor(public clientId:string, public limit:number) {
    }
  }
  export class YoutubeConfig {
    constructor(public apiKey:string) {
    }
  }
}

module consensus {
  var SC = window['SC'];
  SC.initialize({
    client_id: 'b45b1aa10f1ac2941910a7f0d10f8e28',
    redirect_uri: 'html/callback.html'
  });

  var soundManager = window['soundManager'];
  $('#spotify-player').attr('src', '//embed.spotify.com/?uri=spotify:track:0s2d069MZXKFfBDRJWm7Bo');
  $('body').show();

  angular.module('consensus', ['ngCookies', 'mgcrea.ngStrap'])
    .constant('spotifyIFrameId', 'spotify-player')
    .constant('soundcloudConfig', new SoundCloudConfig('b45b1aa10f1ac2941910a7f0d10f8e28', 20))
    .constant('youtubeConfig', new YoutubeConfig('AIzaSyAxMPtoBR3TU4gZr2X0JgJo562UjGsIj3U'))
    .constant('SC', SC)
    .constant('SocketIOClientStatic', io)
    .constant('soundManager', soundManager)
    .value('playState', new PlayerState())

    .service('uuidGenerator', UUIDGenerator)
    .service('socket', Socket)
    .service('syncedTime', SyncedTime)

    //.service('search', SpotifySearch)
    .service('spotifySearcher', SpotifySearcher)
    .service('syncedSpotifySearcher', SyncedSpotifySearcher)
    .service('youtubeSearcher', YouTubeSearcher)
    .service('syncedYouTubeSearcher', SyncedYouTubeSearcher)
    .service('soundcloudSearcher', SoundCloudSearcher)
    .service('syncedSoundCloudSearcher', SyncedSoundCloudSearcher)

    .service('spotifyPlayer', SpotifyPlayer)
    .service('youtubePlayer', YouTubePlayer)
    .service('soundcloudPlayer', SoundCloudPlayer)
    .service('timedPlayer', TimedPlayer)

    .controller('SearchController', SearchController)
    .controller('QueueController', QueueController)

    .filter('humanizeDuration', () => (input) => moment.duration(input)['format']('h:mm:ss'))
}
