module consensus {
  export class QuickController {
    private connectedSocket:angular.IPromise<SocketIOClient.Socket>;

    static $inject = ['socket', 'uuidGenerator'];

    constructor(socketService:Socket, private uuidGenerator:UUIDGenerator) {
      this.connectedSocket = socketService.connected();
    }

    private quickAdd(song:Song):void {
      this.connectedSocket.then((socket:SocketIOClient.Socket) => socket.emit('enqueue', song));
    }

    public soundCloudQuickAdd():void {
      this.quickAdd(new Song(
        this.uuidGenerator.generate(),
        '/tracks/68775204',
        10136,
        Source.SOUND_CLOUD,
        'weird piano'
      ));
    }

    public youtubeQuickAdd():void {
      this.quickAdd(new Song(
        this.uuidGenerator.generate(),
        'R0uWDDq0F8w',
        271000,
        Source.YOUTUBE,
        'The Birth of Captain Murphy | Adult Swim'
      ));
    }

    public spotifyQuickAdd():void {
      this.quickAdd(new Song(
        this.uuidGenerator.generate(),
        'spotify:track:3DSP6mATcidJI7NjJ93pud',
        640026, Source.SPOTIFY,
        'Do'
      ));
    }
  }
}
