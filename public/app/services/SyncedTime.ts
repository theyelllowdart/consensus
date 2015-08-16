import socket = require('Socket')

export class SyncedTime {
  private availablePromise:angular.IPromise<any>;

  static $inject = ['$q', 'socket'];

  constructor($q: angular.IQService, socketService:socket.Socket) {
    var availableDefer = $q.defer();
    this.availablePromise = availableDefer.promise;
    socketService.connected().then((socket) => {
      var syncs = [];
      for (var i = 0; i < 5; i++) {
        syncs.push(i * 500)
      }

      var goTime = window['GoTime'];
      goTime.setOptions({
        AjaxURL: "/time",
        SyncInitialTimeouts: syncs, // First set of syncs (ms from initialization) [default]
        SyncInterval: 900000,       // Follow-up syncs happen at interval of 15 minutes [default]
        WhenSynced: (time, method, offset, precision) => {
          console.log("Synced for first time");
        },
        OnSync: (time, method, offset, precision) => {
          console.log("Synced for second or higher time")
        }
      });

      //Give GoTime a function that will send a websocket message to get the server time
      goTime.wsSend(() => {
        socket.emit("time", {"requestTime": Date.now()});
        return true; // tell GoTime that websocket message was sent
      });

      socket.on('time', (data) => {
        goTime.wsReceived(data.serverTime);
        if (goTime._syncCount >= syncs.length){
          availableDefer.resolve();
        }
      });

    });
  }

  public whenSynced(): angular.IPromise<any> {
    return this.availablePromise
  }

  public now(): number {
    return window['GoTime'].now();
  }
}
