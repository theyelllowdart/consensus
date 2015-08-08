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
/// <reference path='rooms.ts' />
/// <reference path='../typings/errorhandler/errorhandler.d.ts' />
require('dotenv').load({ path: "../.env" });
var express = require('express');
var http = require("http");
var socketIO = require('socket.io');
var url = require('url');
var redis = require('redis');
var pgp = require('pg-promise');
var passport = require('passport');
var passportSocketIO = require("passport.socketio");
var googleStrategy = require('passport-google-oauth');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var cookieParser = require('cookie-parser');
var errorhandler = require('errorhandler');
var path = require('path');
var rooms = require('./rooms');
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var redisURL = url.parse(process.env.REDIS_URL);
var redisClient = redis.createClient(redisURL.port, redisURL.hostname);
redisClient.auth(redisURL.auth.split(":")[1]);
var redisStore = new RedisStore({ client: redisClient });
var pgURL = process.env.DATABASE_URL;
var db = pgp()(pgURL).connect().then(function (db) {
    console.log('connected to postgres');
    return db;
});
db.done(function () {
}, function (error) {
    throw error;
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
    cookie: { maxAge: 100000000000 }
}));
app.use(passport.initialize());
app.use(passport.session());
io.use(passportSocketIO.authorize({
    cookieParser: cookieParser,
    key: 'connect.sid',
    secret: secret,
    store: redisStore,
    success: function (data, accept) {
        accept();
    },
    fail: function (data, message, error, accept) {
        if (error) {
            throw new Error(message);
        }
        console.log('failed connection to socket.io:', message);
        accept(new Error(message));
    }
}));
passport.serializeUser(function (email, done) { return done(null, email); });
passport.deserializeUser(function (email, done) { return done(null, email); });
passport.use(new googleStrategy.OAuth2Strategy({
    clientID: process.env.GOOLGE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_APP_CLIENT_SECRET,
    callbackURL: process.env.CALLBACKURL
}, function (accessToken, refreshToken, profile, done) { return done(null, profile.emails[0].value); }));
app.get('/oauth2callback', function (req, res, next) {
    passport.authenticate('google', {
        failureRedirect: '/error',
        successRedirect: req.cookies.redirect
    })(req, res, next);
});
function reqAuth(req, res, next) {
    if (req.user) {
        next();
    }
    else {
        res.cookie('redirect', req.url);
        passport.authenticate('google', { scope: 'email' })(req, res, next);
    }
}
app.get('/', reqAuth, function (req, res, next) {
    res.redirect('/room/fsqny');
});
app.get('/room/:id', reqAuth, function (req, res, next) {
    res.sendFile(path.join(__dirname + '/../../public/blah.html'));
});
rooms.setup(io, db);
app.set('port', (process.env.PORT || 8080));
server.listen(app.get('port'), function () { return console.log('listening on ' + app.get('port')); });
