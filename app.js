require('dotenv').load();
var express = require('express');
var app = express();

var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var util = require('util');
var _ = require('lodash');
var postgres = require('pg');

var databaseURL = process.env.DATABASE_URL;
postgres.connect(databaseURL, function (err, client, done) {
  if (err) {
    return console.error('error fetching client from pool', err);
  }
  done();
});

var redis = require('redis');
var url = require('url');

var redisURL = url.parse(process.env.REDIS_URL);
var client = redis.createClient(redisURL.port, redisURL.hostname);

//----------SECURITY---------------
var secret = process.env.COOKIE_SECRET;
var passport = require('passport');
var passportSocketIo = require("passport.socketio");
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var LocalStrategy = require('passport-local').Strategy;
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var sessionStore = new session.MemoryStore();
var redisClient = new RedisStore({client: client});
app.use(session({
  store: redisClient,
  secret: secret,
  saveUninitialized: false,
  resave: false,
  cookie: {maxAge: 100000000000}
}));
app.use(passport.initialize());
app.use(passport.session());
var cookieParser = require('cookie-parser');

io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,
  key: 'connect.sid',
  secret: secret,
  store: redisClient,
  success: function onAuthorizeSuccess(data, accept) {
    accept();
  },
  fail: function onAuthorizeFail(data, message, error, accept) {
    if (error) {
      accept(new Error(message));
    }
  }
}));

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (id, done) {
  done(null, id);
});

passport.use(new GoogleStrategy({
    clientID: '227716408358-fgfc4m43ec3qup0p8rjler19miuf1jkl.apps.googleusercontent.com',
    clientSecret: process.env.GOOGLE_APP_CLIENT_SECRET,
    callbackURL: process.env.CALLBACKURL
  },
  function (accessToken, refreshToken, profile, done) {
    return done(null, profile.emails[0].value);
  }
));

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'email',
    passReqToCallback: true,
    session: false
  },
  function (req, username, password, done) {
    if (process.env.MODE === "DEV") {
      done(null, username);
    } else {
      done("Local strategy authentication has been disabled from non DEV modes.")
    }
  }
));

app.get('/auth/provider', passport.authenticate('google', {scope: 'email'}));

app.get('/oauth2callback',
  passport.authenticate('google', {
    failureRedirect: '/',
    successRedirect: '/'
  })
);
//----------END SECURITY---------------

app.use(express.static(path.join(__dirname, '/public')));

var songQueue = [];
var delaySongDuration = 1000;

io.on('connection', function (socket) {
  var userEmail = socket.request.user;
  console.log('user ' + userEmail + ' connected');
  socket.on('disconnect', function () {
    console.log('user ' + userEmail + ' disconnected');
  });
  socket.on('time', function (data) {
    data.serverTime = Date.now();
    socket.emit("time", data)
  });
  socket.on('clear', function () {
    songQueue = [];
    io.emit('queueChange', songQueue);
  });
  socket.on('enqueue', function (song) {
    song.creator = userEmail;
    song.scheduled = new Date();
    song.downvotes = [];
    song.upvotes = [userEmail];
    songQueue.push(song);
    if (songQueue.length === 1) {
      startSong(io, songQueue[0])
    }
    postgres.connect(databaseURL, function (err, client, done) {
      if (err) {
        return console.error('error fetching client from pool', err);
      }
      client.query(
        'INSERT into Song (id, creator, url, duration, source, name, upvotes, downvotes, start, scheduled) ' +
        'VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [song.id, song.creator, song.url, song.duration, song.source, song.name, song.upvotes, song.downvotes, song.start, song.scheduled],
        function (err) {
          done();
          if (err) {
            return console.error('error running query', err);
          }
        });
    });
    io.emit('queueChange', songQueue);
  });
  socket.on('upvote', function (id) {
    vote(io, id, userEmail, function (song) {
      return song.upvotes;
    }, function (song) {
      return song.downvotes;
    })
  });
  socket.on('downvote', function (id) {
    vote(io, id, userEmail, function (song) {
      return song.downvotes;
    }, function (song) {
      return song.upvotes;
    })
  });
  socket.on('status', function () {
    socket.emit('queueChange', songQueue);
  });
});

function vote(io, id, userEmail, sameVotesFn, oppositeVotesFn) {
  var index = _.findIndex(songQueue, function (song) {
    return song.id === id;
  });
  if (index === -1) return false;
  var song = songQueue[index];
  _.remove(oppositeVotesFn(song), function (email) {
    return email === userEmail;
  });
  var nullifiedVote = _.remove(sameVotesFn(song), function (email) {
    return email === userEmail;
  });
  if (nullifiedVote.length === 0) {
    sameVotesFn(song).push(userEmail)
  }
  if (song.downvotes.length >= song.upvotes.length) {
    songQueue.splice(index, 1);
    if (index === 0 && songQueue.length > 0) {
      startSong(io, songQueue[0]);
    }
  }
  io.emit('queueChange', songQueue);
}

function startSong(io, song) {
  function endSongTimeoutFn(io, song) {
    setTimeout(function () {
      // guard for case if downvoting removes song
      if (songQueue.length > 0 && songQueue[0].id === song.id) {
        songQueue.shift();
        if (songQueue.length > 0) {
          startSong(io, songQueue[0])
        }
        io.emit('queueChange', songQueue);
      }
    }, song.duration + (delaySongDuration * 2));
  }

  song.start = Date.now() + delaySongDuration;
  endSongTimeoutFn(io, song);
}


app.get('/localAuth',
  passport.authenticate('local', {failureRedirect: '/'}),
  function (req, res) {
    res.redirect('/');
  }
);

app.get('/', function (req, res) {
  if (req.user)
    res.sendFile(path.join(__dirname + '/public/blah.html'));
  else
    res.redirect('/auth/provider')
});

app.get('/history', function (req, res) {
  postgres.connect(databaseURL, function (err, client, done) {
    if (err) {
      return console.error('error fetching client from pool', err);
    }
    client.query('SELECT * FROM SONG ORDER BY scheduled desc LIMIT 100', function (err, result) {
      done();
      if (err) {
        return console.error('error running query', err);
      }
      res.json(result.rows);
    });
  });
});

app.set('port', (process.env.PORT || 8080));
http.listen(app.get('port'), function () {
  console.log('listening on *:' + app.get('port'));
});
