import {useEffect, useState} from 'react'

import { socket } from './system/socket.ts'
import {ConnectionManager} from "./components/ConnectionManager.tsx";
import {AudioSystem} from "./components/AudioSystem.tsx";

function TokenizerPlayground() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  //const [fooEvents, setFooEvents] = useState([]);

  useEffect(() => {
    function onConnect() {
        console.log("onConnect called")
      setIsConnected(true);
    }

    function onDisconnect() {
        console.log("onDisconnect called")
      setIsConnected(false);
    }

    /*function onFooResponseEvent(value: any) {
        console.log("onFooResponsEvent", value)
      //setFooEvents(previous => [...previous, value]);
    }*/

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    //socket.on('fooResponse', onFooResponseEvent);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      //socket.off('fooResponse', onFooResponseEvent);
    };
  }, []);


  return (
    <>
      <h1>Audiocraft Tokenizer Playground</h1>
        <AudioSystem />
        <ConnectionManager />
        <div>is connected: {isConnected ? "1" : "0"}</div>
    </>
  )
}

export default TokenizerPlayground;
