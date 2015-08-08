module consensus {
  export class Socket {
    private connectedSocketDefer:angular.IDeferred<SocketIOClient.Socket>;

    static $inject = [
      '$q',
      'SocketIOClientStatic',
      '$location'
    ];

    constructor(private $q:angular.IQService,
                private io:SocketIOClientStatic,
                private $location:angular.ILocationService) {
      this.connectedSocketDefer = $q.defer();
      // TODO(aaron): Use route params instead of regex to get room;
      var room = $location.path().match("room/(.*)$")[1];
      var socket = io({query: {room: room}});
      socket.on('connect', () => {
        this.connectedSocketDefer.resolve(socket);
      });
      socket.on('error', (error) => console.error(error));
    }

    public connected():angular.IPromise<SocketIOClient.Socket> {
      return this.connectedSocketDefer.promise;
    }
  }
}
