/// <reference path='../typings/cookie-parser/cookie-parser.d.ts' />
/// <reference path='../typings/express-session/express-session.d.ts' />
/// <reference path='../typings/express/express.d.ts' />
/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../typings/socket.io/socket.io.d.ts' />
/// <reference path='../typings/redis/redis.d.ts' />
/// <reference path='../typings/pg/pg.d.ts' />
/// <reference path='../typings/passport/passport.d.ts' />
/// <reference path='../typings/passport-local/passport-local.d.ts' />
/// <reference path='../typings/passport-google-oauth/passport-google-oauth.d.ts' />
/// <reference path='initializer.ts' />
/// <reference path='../typings/errorhandler/errorhandler.d.ts' />

require('dotenv').load({path: "../.env"});
import express = require('express');
import http = require("http");
import socketIO = require('socket.io')
import url = require('url');
import redis = require('redis');
var pgp = (<any> require('pg-promise'));
import passport = require('passport');
var passportSocketIO = require("passport.socketio");
import googleStrategy = require('passport-google-oauth');
import localStrategy = require('passport-local');
import session = require('express-session');
var RedisStore = require('connect-redis')(session);
import cookieParser = require('cookie-parser');
import errorhandler = require('errorhandler');
var path = require('path');

var app = express();
var server = http.createServer(app);
var io = (<SocketIO.Server> socketIO(server));

var redisURL = url.parse(process.env.REDIS_URL);
var redisClient = redis.createClient(redisURL.port, redisURL.hostname);
redisClient.auth(redisURL.auth.split(":")[1]);
var redisStore = new RedisStore({client: redisClient});

var pgURL = process.env.DATABASE_URL;
var db = pgp()(pgURL).connect().then((db) => {
  console.log('connected to postgres');
  return db;
});
db.done(() => {
}, (error) => {
  throw error
});

app.use(express.static(path.join(__dirname, '/../../public')));
app.use(errorhandler());
app.use(cookieParser());
var secret = process.env.COOKIE_SECRET;
app.use(session({
  store: redisStore,
  secret: secret,
  saveUninitialized: false,
  resave: false,
  cookie: {maxAge: 100000000000}
}));
app.use(passport.initialize());
app.use(passport.session());
io.use(passportSocketIO.authorize({
  cookieParser: cookieParser,
  key: 'connect.sid',
  secret: secret,
  store: redisStore,
  success: (data, accept) => {
    accept()
  },
  fail: (data, message, error, accept) => {
    if (error) {
      throw new Error(message);
    }
    console.log('failed connection to socket.io:', message);
    accept(new Error(message));
  }
}));
passport.serializeUser((email, done) => done(null, email));
passport.deserializeUser((email, done) => done(null, email));
passport.use(new googleStrategy.OAuth2Strategy({
    clientID: '227716408358-fgfc4m43ec3qup0p8rjler19miuf1jkl.apps.googleusercontent.com',
    clientSecret: process.env.GOOGLE_APP_CLIENT_SECRET,
    callbackURL: process.env.CALLBACKURL
  },
  (accessToken, refreshToken, profile, done) => done(null, profile.emails[0].value)
));
app.get('/oauth2callback', (req:express.Request, res:express.Response, next:Function) => {
  passport.authenticate('google', {
    failureRedirect: '/error',
    successRedirect: req.cookies.redirect
  })(req, res, next);
});


Initializer.setupRooms(io, db);

app.get('/', reqAuth, (req:express.Request, res:express.Response, next:Function) => {
  res.redirect('/room/fsqny')
});

app.get('/room/:id', reqAuth, (req:express.Request, res:express.Response, next:Function) => {
  res.sendFile(path.join(__dirname + '/../../public/blah.html'));
});

function reqAuth(req:express.Request, res:express.Response, next:Function) {
  if (req.user) {
    next();
  } else {
    res.cookie('redirect', req.url);
    passport.authenticate('google', {scope: 'email'})(req, res, next);
  }
}

app.set('port', (process.env.PORT || 8080));
server.listen(app.get('port'), () => console.log('listening on ' + app.get('port')));
