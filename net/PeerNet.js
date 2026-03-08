// net/PeerNet.js
// Thin PeerJS wrapper. One peer, one connection at a time.
// Use the global NET singleton throughout the app.
class PeerNet {
  constructor() {
    this.peer = null;
    this.conn = null;
    this._onMessage = null;
    this._onClose = null;
  }

  // HOST: call this to wait for one incoming connection.
  // onConn(conn) fires when a peer connects.
  initHost(onConn) {
    this.peer = new Peer();
    this.peer.on('open', () => {
      this.peer.on('connection', conn => {
        this.conn = conn;
        this._setupConn(conn);
        onConn(conn);
      });
    });
    this.peer.on('error', err => console.error('[PeerNet] error:', err));
  }

  // CLIENT: connect to hostId, onOpen() fires when the data channel is ready.
  connect(hostId, onOpen) {
    this.peer = new Peer();
    this.peer.on('open', () => {
      this.conn = this.peer.connect(hostId, { reliable: true });
      this._setupConn(this.conn);
      this.conn.on('open', onOpen);
    });
    this.peer.on('error', err => console.error('[PeerNet] error:', err));
  }

  _setupConn(conn) {
    conn.on('data', data => this._onMessage && this._onMessage(data));
    conn.on('close', () => this._onClose && this._onClose());
  }

  onMessage(cb) { this._onMessage = cb; }
  onClose(cb) { this._onClose = cb; }

  send(data) {
    if (this.conn && this.conn.open) this.conn.send(data);
  }

  getPeerId() {
    return this.peer ? this.peer.id : null;
  }

  destroy() {
    if (this.conn) { try { this.conn.close(); } catch(e){} }
    if (this.peer) { try { this.peer.destroy(); } catch(e){} }
    this.peer = null;
    this.conn = null;
  }
}

const NET = new PeerNet();
