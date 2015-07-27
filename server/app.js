require('dotenv').load();
var express = require('express');
var app = express();

var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);
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
client.auth(redisURL.auth.split(":")[1]);

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
      throw new Error(message);
    }
    console.log('failed connection to socket.io:', message);
    accept(new Error(message));
  }
}));

passport.serializeUser(function (email, done) {
  done(null, email);
});

passport.deserializeUser(function (email, done) {
  done(null, email);
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

app.use(express.static(path.join(__dirname, '/../public')));


require('./logic.js')(io, postgres, databaseURL);

app.get('/localAuth',
  passport.authenticate('local', {failureRedirect: '/'}),
  function (req, res) {
    res.redirect('/');
  }
);

app.get('/', function (req, res) {
  if (req.user)
    res.sendFile(path.join(__dirname + '/../public/blah.html'));
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
