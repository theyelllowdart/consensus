var bowerFiles = require('bower-files');
var argv = require('yargs').argv;
var concat = require('gulp-concat');
var gulp = require('gulp');
var gulpIf = require('gulp-if');
var minifyCSS = require('gulp-minify-css');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var replace = require('gulp-replace');
var requirejs = require('requirejs');
var sourceMaps = require('gulp-sourcemaps');
var StreamQueue = require('streamqueue');
var ts = require('gulp-typescript');

var projectBowerFiles = bowerFiles({
  overrides: {
    SoundManager2: {
      main: './script/soundmanager2.js'
    },
    'socket.io-client': {
      main: 'socket.io.js'
    },
    'soundcloud-javascript': {
      main: './releases/sdk.js'
    },
    'bootstrap-css-only': {
      main: ['./css/bootstrap.css', './css/bootstrap-theme.css']
    }
  }
});

function reportError(error) {
  notify({
    title: 'Gulp Task Error',
    message: 'Check the console.'
  }).write(error);
  this.emit('end');
}

gulp.task('scripts', function () {
  return gulp.src('public/app/**/*.ts')
    .pipe(ts({sortOutput: true, module: 'amd'}))
    .pipe(gulp.dest('public/generated/js'));
});

gulp.task('watch-scripts', function () {
  return gulp.watch(['public/app/**/*.ts'], ['scripts']);
});

gulp.task('css', function () {
  var bower = gulp.src(projectBowerFiles.ext('css').files);
  var css = gulp.src('public/css/*.css');

  var stream = new StreamQueue({objectMode: true});
  stream.queue(bower);
  stream.queue(css);

  return stream.done()
    .pipe(plumber({errorHandler: reportError}))
    .pipe(gulpIf(!argv.production, sourceMaps.init()))
    .pipe(concat('output.css'))
    .pipe(gulpIf(argv.production, minifyCSS()))
    .pipe(gulpIf(!argv.production, sourceMaps.write()))
    .pipe(gulp.dest('public/generated'))
    .on('error', reportError);
});

gulp.task('watch-css', function () {
  return gulp.watch(['public/css/*.css'], ['css']);
});

gulp.task('server', function () {
  return gulp.src(['public/app/models/Models.ts', 'server/*.ts'])
    .pipe(plumber({errorHandler: reportError}))
    .pipe(ts({sortOutput: true, module: 'commonjs'}))
    // HACK(aaron): replace require("../public/app/Models/Models") with require("./Models")
    .pipe(replace('\.\.\/public\/app\/Models\/Models', './Models'))
    .pipe(gulp.dest('server/generated'))
    .on('error', reportError);
});

gulp.task('watch-server', function () {
  return gulp.watch(['server/*.ts'], ['server']);
});

gulp.task('watch-the-watchmen', ['watch-scripts', 'watch-css', 'watch-server']);

gulp.task('app', ['requirejs', 'css', 'server']);

gulp.task("requireOptimize", ['scripts'], function (done) {
  return requirejs.optimize({
    baseUrl: "public/generated/js",
    out: "public/generated/build/YouTubeIFrame.js",
    enforceDefine: true,
    paths: {
      jquery: "../../../bower_components/jquery/dist/jquery",
      angular: "../../../bower_components/angular/angular",
      angularCookie: "../../../bower_components/angular-cookie/angular-cookie",
      angularStrap: "../../../bower_components/angular-strap/dist/angular-strap",
      angularStrapTPL: "../../../bower_components/angular-strap/dist/angular-strap.tpl",
      GoTime: "../../../bower_components/GoTime/GoTime",
      lodash: "../../../bower_components/lodash/lodash",
      moment: "../../../bower_components/moment/moment",
      momentDurationFormat: "../../../bower_components/moment-duration-format/lib/moment-duration-format",
      socketIOClient: "../../../bower_components/socket.io-client/socket.io",
      SoundManager: "../../../bower_components/SoundManager2/script/soundmanager2",
      soundcloudJavascript: "../../../bower_components/soundcloud-javascript/releases/sdk"
    },
    name: "YouTubeIFrame",
    optimize: 'none',
    shim: {
      momentDurationFormat: {
        deps: ['moment']
      },
      soundcloudJavascript: {
        deps: ['SoundManager'],
        init: function (SoundManager) {
          window.soundManager = SoundManager.soundManager;
        }
      }
    },
    wrapShim: true
  }, function (e) {
    console.log(e);
    done();
  }, function (e) {
    console.error(e);
    done();
  });
});

gulp.task("requirejs", ["requireOptimize"], function () {
  return gulp.src("bower_components/requirejs/require.js")
    .pipe(gulp.dest('public/generated/js'));
});
