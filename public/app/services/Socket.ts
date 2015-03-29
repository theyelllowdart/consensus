module consensus {
  export class Socket {
    private connectedSocketDefer:angular.IDeferred<SocketIOClient.Socket>;

    static $inject = ['$q', 'SocketIOClientStatic'];

    constructor($q:angular.IQService, private io:SocketIOClientStatic) {
      this.connectedSocketDefer = $q.defer();
      var socket = io();
      socket.on('connect', () => {
        this.connectedSocketDefer.resolve(socket);
      });
    }

    public connected(): angular.IPromise<SocketIOClient.Socket> {
      return this.connectedSocketDefer.promise;
    }
  }
}
