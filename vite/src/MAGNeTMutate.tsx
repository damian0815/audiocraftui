
import { socket } from './system/socket.ts'
import {ConnectionManager} from "./components/ConnectionManager.tsx";
import {useEffect, useState} from "react";
import {TokensGrid} from "./components/TokensGrid.tsx";

import {Audiocraft} from './system/Audiocraft.tsx';
import {WavesurferPanel} from "./components/WavesurferPanel.tsx";
import {ToneAudioBuffer} from "tone";

const audiocraft = new Audiocraft(socket, 'magnet');

function MAGNeTMutate() {

    const [isConnected, setIsConnected] = useState(socket.connected);
    const [tokens, setTokens] = useState<[][]>([]);
    const [prompt, setPrompt] = useState<string>("");
    const [workingAudioBuffer, setWorkingAudioBuffer] = useState<ToneAudioBuffer>();

    useEffect(() => {
        function onConnect() {
            console.log("onConnect called")
          setIsConnected(true);
        }

        function onDisconnect() {
            console.log("onDisconnect called")
          setIsConnected(false);
        }

        function onTokenProgress(uuid: string, tokens: [][]) {
            console.log(`onTokenProgress called, uuid ${uuid}, tokens ${tokens}`);
            setTokens(tokens)
        }

        /*function onFooResponseEvent(value: any) {
            console.log("onFooResponsEvent", value)
          //setFooEvents(previous => [...previous, value]);
        }*/

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('tokenProgress', onTokenProgress);
        //socket.on('fooResponse', onFooResponseEvent);

        return () => {
          socket.off('connect', onConnect);
          socket.off('disconnect', onDisconnect);
          //socket.off('fooResponse', onFooResponseEvent);
        };
      }, []);

    function generate() {
        if (prompt.trim().length > 0) {
            console.log(`sending generate with prompt '${prompt}'`)
            audiocraft.generate(prompt, (tokens: [][]) => {
                console.log("generate progress tokens:", tokens)
                setTokens(tokens);
            })
        }
    }

    function decode() {
        if (tokens.length > 0) {
            audiocraft.detokenize(tokens, ToneAudioBuffer.prototype.sampleRate, (audioFloats: Float32Array) => {
                const audio = ToneAudioBuffer.fromArray(audioFloats)
                console.log("detokenized to", audio, "buffer", audio.get(), "->assigning to workingAudioBuffer")
                setWorkingAudioBuffer(audio)
            })
        }
    }

    return (
        <>
            <h1>MAGNeT Mutation</h1>
            <div>
                <div><textarea placeholder={"enter prompt"} onChange={(e) => setPrompt(e.target.value)}></textarea></div>
                <button onClick={ generate }>Generate</button>
            </div>
            <TokensGrid data={tokens} tokensModifiedCallback={() => {}} />
            <button onClick={ decode }>Decode</button>
            { workingAudioBuffer && <WavesurferPanel id={"working"} audioBuffer={workingAudioBuffer} /> }

            <div>
                <ConnectionManager />
                <div>is connected: {isConnected ? "1" : "0"}</div>
            </div>
        </>
    )

}

export default MAGNeTMutate;