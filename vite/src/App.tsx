import {useEffect, useState} from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import { socket } from './system/socket.ts'
import {ConnectionManager} from "./components/ConnectionManager.tsx";
import {TokensGrid} from "./components/TokensGrid.tsx";
import {AudioSystem} from "./components/AudioSystem.tsx";

function App() {
  const [count, setCount] = useState(0)
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

    function onFooResponseEvent(value: any) {
        console.log("onFooResponsEvent", value)
      //setFooEvents(previous => [...previous, value]);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('fooResponse', onFooResponseEvent);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('fooResponse', onFooResponseEvent);
    };
  }, []);

  const sendTokens = () => {
      console.log("emitting set_tokens")
      socket.emit("set_tokens", [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10,11,12]] )
  }

  return (
    <>
      <h1>Audiocraft Tokenizer Playground</h1>
        <AudioSystem />
        <ConnectionManager />
        <div>is connected: {isConnected ? "1" : "0"}</div>
    </>
  )
}

export default App
