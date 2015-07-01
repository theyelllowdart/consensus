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
  console.log('connected to database');
});

//----------SECURITY---------------
var secret = process.env.COOKIE_SECRET;
var passport = require('passport');
var passportSocketIo = require("passport.socketio");
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var session = require('express-session');
var sessionStore = new session.MemoryStore();
app.use(session({store: sessionStore, secret: secret, saveUninitialized: false, resave: true}));
app.use(passport.initialize());
app.use(passport.session());
var cookieParser = require('cookie-parser');

io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,
  key: 'connect.sid',
  secret: secret,
  store: sessionStore,
  success: function onAuthorizeSuccess(data, accept) {
    console.log('successful connection to socket.io');
    accept();
  },
  fail: function onAuthorizeFail(data, message, error, accept) {
    if (error)
      throw new Error(message);
    console.log('failed connection to socket.io:', message);
    if (error)
      accept(new Error(message));
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
    console.log("passported");
    console.log(profile);
    return done(null, profile);
  }
));

app.get('/login/failed', function () {
  console.log("login");
});

app.get('/auth/provider', passport.authenticate('google', {scope: 'email'}));

app.get('/oauth2callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    successRedirect: '/'
  })
);
//----------END SECURITY---------------

app.use(express.static(path.join(__dirname, '/public')));

var songQueue = [];
var delaySongDuration = 1000;

io.on('connection', function (socket) {
  var userEmail = socket.request.user.emails[0].value;
  console.log('a user connected');
  socket.on('disconnect', function () {
    console.log('user disconnected');
  });
  socket.on('time', function (data) {
    data.serverTime = Date.now();
    socket.emit("time", data)
  });
  socket.on('clear', function () {
    console.log('clear queue');
    songQueue = [];
    io.emit('queueChange', songQueue);
  });
  socket.on('enqueue', function (song) {
    song.creator = userEmail;
    song.downvotes = [];
    song.upvotes = [socket.request.user.emails[0].value];
    songQueue.push(song);
    if (songQueue.length === 1) {
      console.log('adding to song to empty queue ' + util.inspect(song));
      startSong(io, songQueue[0])
    }
    postgres.connect(databaseURL, function (err, client, done) {
      if (err) {
        return console.error('error fetching client from pool', err);
      }
      client.query(
        'INSERT into Song (id, creator, url, duration, source, name, upvotes, downvotes, start) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [song.id, song.creator, song.url, song.duration, song.source, song.name, song.upvotes, song.downvotes, song.start],
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
        console.log('endSong ' + util.inspect(song));
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
    client.query('SELECT * FROM SONG ORDER BY start desc LIMIT 100', function (err, result) {
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
