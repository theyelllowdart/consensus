var gulp = require('gulp');
var bowerFiles = require('bower-files');
var concat = require('gulp-concat');
var gulpIf = require('gulp-if');
var minifyCSS = require('gulp-minify-css');
var sourceMaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var uglify = require('gulp-uglify');
var StreamQueue = require('streamqueue');
var argv = require('yargs').argv;

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

gulp.task('scripts', function () {
  var bower = gulp
    .src(projectBowerFiles.ext('js').files)
    .pipe(gulpIf(!argv.production, sourceMaps.init()))
    .pipe(gulpIf(argv.production, uglify()));

  var typeScript = gulp.src('public/app/**/*.ts')
    .pipe(gulpIf(!argv.production, sourceMaps.init()))
    .pipe(ts({sortOutput: true}))
    .pipe(gulpIf(argv.production, uglify()));

  var stream = new StreamQueue({objectMode: true});
  stream.queue(bower);
  stream.queue(typeScript);

  return stream.done()
    .pipe(concat('output.js'))
    .pipe(gulpIf(!argv.production, sourceMaps.write()))
    .pipe(gulp.dest('public/generated'));
});

gulp.task('server', function () {
  return gulp.src('server/*.ts')
    .pipe(ts({sortOutput: true, module: 'commonjs'}))
    .pipe(gulp.dest('server/generated'));
});

gulp.task('watch', function() {
  return gulp.watch(['server/*.ts'], ['server']);
});

gulp.task('css', function () {
  var bower = gulp.src(projectBowerFiles.ext('css').files);
  var css = gulp.src('public/css/*.css');

  var stream = new StreamQueue({objectMode: true});
  stream.queue(bower);
  stream.queue(css);

  return stream.done()
    .pipe(gulpIf(!argv.production, sourceMaps.init()))
    .pipe(concat('output.css'))
    .pipe(gulpIf(argv.production, minifyCSS()))
    .pipe(gulpIf(!argv.production, sourceMaps.write()))
    .pipe(gulp.dest('public/generated'));
});
