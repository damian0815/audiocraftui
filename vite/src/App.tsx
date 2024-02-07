import {useEffect, useState} from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import { socket } from './socket.ts'
import {ConnectionManager} from "./ConnectionManager.tsx";

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


  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
        <div className="card">
            <ConnectionManager />
          <button onClick={ () => socket.emit("foo") }>Foo</button>

            <div>is connected: {isConnected ? "1" : "0"}</div>
        </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App