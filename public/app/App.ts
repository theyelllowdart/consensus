/// <reference path="../../typings/tsd.d.ts"/>

/// <amd-dependency path="socketIOClient" name="io"/>
/// <amd-dependency path="jquery"/>
/// <amd-dependency path="angular"/>
/// <amd-dependency path="angularCookie"/>
/// <amd-dependency path="angularStrap"/>
/// <amd-dependency path="angularStrapTPL"/>
/// <amd-dependency path="GoTime"/>
/// <amd-dependency path="lodash"/>
/// <amd-dependency path="moment" name="moment"/>
/// <amd-dependency path="momentDurationFormat"/>
/// <amd-dependency path="SoundManager" name="soundManager"/>
/// <amd-dependency path="soundcloudJavascript"/>

import socket = require('services/Socket');
import syncedTime = require('services/SyncedTime');

import player = require('services/player/Player');
import soundcloudPlayer = require('services/player/SoundCloudPlayer');
import spotifyPlayer = require('services/player/SpotifyPlayer');
import timedPlayer = require('services/player/TimedPlayer');
import youtubePlayer = require('services/player/YouTubePlayer');

import soundcloudSearcher = require('services/searcher/SoundCloudSearcher');
import spotifySearcher = require('services/searcher/SpotifySearcher');
import syncSearcher = require('services/searcher/SyncSearcher');
import youtubeSearcher = require('services/searcher/YouTubeSearcher');

import queueController = require('controllers/QueueController');
import searchController = require('controllers/SearchController');

declare var io:SocketIOClientStatic;
declare var soundManager:any;
declare var moment:moment.MomentStatic;
declare var SC:any;

SC.initialize({
  client_id: 'bea3e36a337bd563d7ea12b7f6e20861',
  redirect_uri: 'html/callback.html'
});
soundManager.soundManager.beginDelayedInit();

angular.injector(['ng']).invoke(['$q', ($q:angular.IQService) => {
  var youtubeReadyDefer = $q.defer();
  (<any>window).onYouTubeIframeAPIReady = () => {
    angular.element(document).ready(() => {
      var ytPlayer = new YT.Player('youtube-player', {
        events: {
          onReady: () => {
            youtubeReadyDefer.resolve(ytPlayer);
          }
        }
      });
    })
  };

  angular.module('consensus', ['ipCookie', 'mgcrea.ngStrap'])
    .constant('spotifyRemoteId', 'spotify-player')
    .constant('soundcloudConfig', new soundcloudSearcher.SoundCloudConfig('bea3e36a337bd563d7ea12b7f6e20861', 20))
    .constant('youtubeConfig', new youtubeSearcher.YoutubeConfig('AIzaSyAxMPtoBR3TU4gZr2X0JgJo562UjGsIj3U'))
    .constant('SC', SC)
    .constant('SocketIOClientStatic', io)
    .constant('soundManager', soundManager.soundManager)
    .constant('moment', moment)
    .constant('playState', new player.PlayerState())
    .constant('ytPlayerPromise', youtubeReadyDefer.promise)

    .service('socket', socket.Socket)
    .service('syncedTime', syncedTime.SyncedTime)

    .service('spotifySearcher', spotifySearcher.SpotifySearcher)
    .service('syncedSpotifySearcher', syncSearcher.SyncedSpotifySearcher)
    .service('youtubeSearcher', youtubeSearcher.YouTubeSearcher)
    .service('syncedYouTubeSearcher', syncSearcher.SyncedYouTubeSearcher)
    .service('soundcloudSearcher', soundcloudSearcher.SoundCloudSearcher)
    .service('syncedSoundCloudSearcher', syncSearcher.SyncedSoundCloudSearcher)

    .service('spotifyPlayer', spotifyPlayer.SpotifyPlayer)
    .service('youtubePlayer', youtubePlayer.YouTubePlayer)
    .service('soundcloudPlayer', soundcloudPlayer.SoundCloudPlayer)
    .service('timedPlayer', timedPlayer.TimedPlayer)

    .controller('SearchController', searchController.SearchController)
    .controller('QueueController', queueController.QueueController)

    .filter('humanizeDuration', () => (input) => moment.duration(input)['format']('h:mm:ss'))

    .config(['$locationProvider', ($locationProvider) => $locationProvider.html5Mode(true)]);
}]);
