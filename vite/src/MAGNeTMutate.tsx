
import { socket } from './system/socket.ts'
import {ConnectionManager} from "./components/ConnectionManager.tsx";
import {useEffect, useState} from "react";
import {TokensGrid} from "./components/TokensGrid.tsx";

import {Audiocraft} from './system/Audiocraft.tsx';
import {WavesurferPanel} from "./components/WavesurferPanel.tsx";
import {ToneAudioBuffer} from "tone";
import InputNumber from "rc-input-number";

import "./MAGNeTMutate.css"

function MAGNeTMutate() {

    const audiocraft = Audiocraft.getInstance(socket, 'magnet')

    const [isConnected, setIsConnected] = useState(socket.connected);
    const [tokens, setTokens] = useState<[][]>([]);
    const [generationUuid, setGenerationUuid] = useState<string|undefined>()
    const [progress, setProgress] = useState<number|undefined>()

    const [prompt, setPrompt] = useState<string>("");
    const [seed, setSeed] = useState<number>(0);
    const [stepsA, setStepsA] = useState<number>(20);
    const [stepsB, setStepsB] = useState<number>(10);
    const [stepsC, setStepsC] = useState<number>(10);
    const [stepsD, setStepsD] = useState<number>(10);

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
            const steps = [stepsA, stepsB, stepsC, stepsD];
            const uuid = audiocraft!.generate(prompt, seed, steps, (progressPct, tokens: [][]) => {
                if (!tokens) {
                    setGenerationUuid(undefined)
                    return
                }
                setProgress(progressPct);
                console.log("generate progress tokens:", tokens);
                setTokens(tokens);

                if (progressPct == 1) {
                    setGenerationUuid(undefined)
                }
            })
            setProgress(0);
            setGenerationUuid(uuid);
        }
    }

    function cancelGeneration() {
        generationUuid && audiocraft!.cancelGeneration(generationUuid)
    }

    function decode() {
        if (tokens.length > 0) {
            audiocraft!.detokenize(tokens, ToneAudioBuffer.prototype.sampleRate, (audioFloats: Float32Array) => {
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
                <div className={"seed"}>Seed:
                    <InputNumber value={seed} onChange={(value) => value && setSeed(value) }/>
                </div>
                <div className={"steps"}>Steps:
                    <InputNumber value={stepsA} onChange={(value) => value && setStepsA(value)} />
                    <InputNumber value={stepsB} onChange={(value) => value && setStepsB(value)} />
                    <InputNumber value={stepsC} onChange={(value) => value && setStepsC(value)} />
                    <InputNumber value={stepsD} onChange={(value) => value && setStepsD(value)} />
                </div>
                { generationUuid && progress && <progress value={ progress } /> }
                { generationUuid && <button onClick={ cancelGeneration }>Cancel</button> }
                { !generationUuid && <button onClick={ generate }>Generate</button> }
            </div>
            <TokensGrid data={tokens} />
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