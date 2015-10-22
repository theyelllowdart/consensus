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

import socket = require('Services/Socket');
import syncedTime = require('Services/SyncedTime');

import player = require('Services/Player/Player');
import soundcloudPlayer = require('Services/Player/SoundCloudPlayer');
import spotifyPlayer = require('Services/Player/SpotifyPlayer');
import timedPlayer = require('Services/Player/TimedPlayer');
import youtubePlayer = require('Services/Player/YouTubePlayer');

import soundcloudSearcher = require('Services/Searcher/SoundCloudSearcher');
import spotifySearcher = require('Services/Searcher/SpotifySearcher');
import syncSearcher = require('Services/Searcher/SyncSearcher');
import youtubeSearcher = require('Services/Searcher/YouTubeSearcher');

import queueController = require('Controllers/QueueController');
import searchController = require('Controllers/SearchController');

declare var io:SocketIOClientStatic;
declare var soundManager:any;
declare var moment:moment.MomentStatic;
declare var SC:any;
SC.initialize({
  client_id: 'bea3e36a337bd563d7ea12b7f6e20861',
  redirect_uri: 'html/callback.html'
});

angular.module('consensus', ['ipCookie', 'mgcrea.ngStrap'])
  .constant('spotifyIFrameId', 'spotify-player')
  .constant('soundcloudConfig', new soundcloudSearcher.SoundCloudConfig('bea3e36a337bd563d7ea12b7f6e20861', 20))
  .constant('youtubeConfig', new youtubeSearcher.YoutubeConfig('AIzaSyAxMPtoBR3TU4gZr2X0JgJo562UjGsIj3U'))
  .constant('SC', SC)
  .constant('SocketIOClientStatic', io)
  .constant('soundManager', soundManager.soundManager)
  .constant('moment', moment)
  .value('playState', new player.PlayerState())

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

angular.bootstrap(document, ['consensus']);
$('body').show();
