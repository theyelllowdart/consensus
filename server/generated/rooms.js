var _ = require('lodash');
function setup(io, db) {
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
            socket.emit("time", data);
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
                startSong(io, songQueue[0]);
            }
            db.then(function (x) { return x.query('INSERT into Song (id, creator, url, duration, source, name, upvotes, downvotes, start, scheduled) ' + 'VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [song.id, song.creator, song.url, song.duration, song.source, song.name, song.upvotes, song.downvotes, song.start, song.scheduled]); });
            io.emit('queueChange', songQueue);
        });
        socket.on('upvote', function (id) {
            vote(io, id, userEmail, function (song) {
                return song.upvotes;
            }, function (song) {
                return song.downvotes;
            });
        });
        socket.on('downvote', function (id) {
            vote(io, id, userEmail, function (song) {
                return song.downvotes;
            }, function (song) {
                return song.upvotes;
            });
        });
        socket.on('status', function () {
            socket.emit('queueChange', songQueue);
        });
    });
    function vote(io, id, userEmail, sameVotesFn, oppositeVotesFn) {
        var index = _.findIndex(songQueue, function (song) {
            return song.id === id;
        });
        if (index === -1)
            return false;
        var song = songQueue[index];
        _.remove(oppositeVotesFn(song), function (email) {
            return email === userEmail;
        });
        var nullifiedVote = _.remove(sameVotesFn(song), function (email) {
            return email === userEmail;
        });
        if (nullifiedVote.length === 0) {
            sameVotesFn(song).push(userEmail);
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
                        startSong(io, songQueue[0]);
                    }
                    io.emit('queueChange', songQueue);
                }
            }, song.duration + (delaySongDuration * 2));
        }
        song.start = Date.now() + delaySongDuration;
        endSongTimeoutFn(io, song);
    }
}
exports.setup = setup;
