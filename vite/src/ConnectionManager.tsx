import { socket } from './socket.ts';

export function ConnectionManager() {
  function connect() {
    console.log("connecting")
    socket.connect();
  }

  function disconnect() {
    console.log("disconnecting")
    socket.disconnect();
  }

  return (
    <>
      <button onClick={ connect }>Connect</button>
      <button onClick={ disconnect }>Disconnect</button>
    </>
  );
}

