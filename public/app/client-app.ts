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
/// <reference path="controllers/QuickController.ts"/>
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
    client_id: 'bea3e36a337bd563d7ea12b7f6e20861',
    redirect_uri: 'html/callback.html'
  });

  var soundManager = window['soundManager'];
  $('#spotify-player').attr('src', '//embed.spotify.com/?uri=spotify:track:0s2d069MZXKFfBDRJWm7Bo');
  $('body').show();

  angular.module('consensus', ['mgcrea.ngStrap'])
    .constant('spotifyIFrameId', 'spotify-player')
    .constant('soundcloudConfig', new SoundCloudConfig('bea3e36a337bd563d7ea12b7f6e20861', 20))
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
    .controller('QuickController', QuickController)
}
