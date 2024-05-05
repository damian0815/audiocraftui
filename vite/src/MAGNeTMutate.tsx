
import { socket } from './system/socket.ts'
import {ConnectionManager} from "./components/ConnectionManager.tsx";
import {useEffect, useState} from "react";
import {TokensGrid} from "./components/TokensGrid.tsx";

import {cloneArray} from './system/cloneArray.tsx';
import {Audiocraft, interpolateTokens} from './system/Audiocraft.tsx';
import {WavesurferPanel} from "./components/WavesurferPanel.tsx";
import {ToneAudioBuffer} from "tone";
import InputNumber from "rc-input-number";

import "./MAGNeTMutate.css"

function MAGNeTMutate() {

    const audiocraft = Audiocraft.getInstance(socket, 'magnet')

    const [isConnected, setIsConnected] = useState(socket.connected);
    const [tokens, setTokens] = useState<[][]>([]);
    const [cachedTokens, setCachedTokens] = useState<[][]|undefined>();

    const [masks, setMasks] = useState<[][]>([]);

    const [generationUuid, setGenerationUuid] = useState<string|undefined>()
    const [progress, setProgress] = useState<number|undefined>()

    const [prompt, setPrompt] = useState<string>("");
    const [seed, setSeed] = useState<number>(0);
    const [maxCFGCoef, setMaxCFGCoef] = useState<number>(10.0);
    const [minCFGCoef, setMinCFGCoef] = useState<number>(1.0);

    const [doAudioToAudio, setDoAudioToAudio] = useState<boolean>(false);

    const [stepsA, setStepsA] = useState<number>(20);
    const [stepsB, setStepsB] = useState<number>(10);
    const [stepsC, setStepsC] = useState<number>(10);
    const [stepsD, setStepsD] = useState<number>(10);

    const [initialTimestepA, setInitialTimestepA] = useState<number>(0);
    const [initialTimestepB, setInitialTimestepB] = useState<number>(0);
    const [initialTimestepC, setInitialTimestepC] = useState<number>(0);
    const [initialTimestepD, setInitialTimestepD] = useState<number>(0);

    const [workingAudioBuffer, setWorkingAudioBuffer] = useState<ToneAudioBuffer>();

    useEffect(() => {
        function onConnect() {
            console.log("onConnect called")
            setIsConnected(true);
        }

        function onDisconnect() {
            console.log("onDisconnect called")
            setIsConnected(false);
            setGenerationUuid(undefined);
            setProgress(undefined);
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
            const initial_tokens = doAudioToAudio ? tokens : null;
            const initial_timesteps = (doAudioToAudio ?
                [initialTimestepA, initialTimestepB, initialTimestepC, initialTimestepD] : null);
            function callback(progressPct: number, tokens: [][]) {

                if (!tokens) {
                    setGenerationUuid(undefined)
                    return
                }
                setProgress(progressPct);
                //console.log("generate progress tokens:", tokens);
                setTokens(tokens);
                setMasks(masks);

                if (progressPct == 1) {
                    setGenerationUuid(undefined)
                }
            }

            const uuid = audiocraft!.generate(
                prompt,
                seed,
                steps,
                callback,
                initial_tokens,
                initial_timesteps,
                minCFGCoef,
                maxCFGCoef
            )

            setProgress(0.0);
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

    async function doInterpolate() {
        const totalTokenLength = tokens[0].length;
        const newTokens: number[][] = new Array();
        const numSteps = 10;
        const tokenSpanWidth = totalTokenLength / numSteps;
        for (var i=0; i<numSteps; i++) {
            console.log("interpolation step", i)
            const alpha = (i/(numSteps-1));
            const firstIndex = i * tokenSpanWidth;
            const lastIndex = (i+1) * tokenSpanWidth;
            const tokensSlice = tokens.map((v) => v.slice(firstIndex, lastIndex))
            const cachedTokensSlice = cachedTokens!.map((v) => v.slice(firstIndex, lastIndex))
            console.log('doing interpolation...')
            const interpolatedSlice = interpolateTokens(tokensSlice, cachedTokensSlice, alpha)
            console.log('writing to newTokens...')
            for (var j=0; j<tokens.length; j++) {
                if (i==0) {
                    newTokens.push(new Array())
                }
                newTokens[j].push(...interpolatedSlice[j])
            }
        }
        setTokens(newTokens)
    }

    return (
        <>
            <h1>MAGNeT Mutation</h1>
            <div>
                <div><textarea placeholder={"enter prompt"} onChange={(e) => setPrompt(e.target.value)}></textarea>
                </div>
                <div className={"seed"}>Seed:
                    <InputNumber value={seed} onChange={(value) => value && setSeed(value)}/>
                </div>
                <div className={"seed"}>CFG coefficients:
                    Max <InputNumber value={maxCFGCoef} onChange={(value) => value && setMaxCFGCoef(value)}/>
                    Min <InputNumber value={minCFGCoef} onChange={(value) => value && setMinCFGCoef(value)}/>
                </div>

                <div className={"steps"}>Steps:
                    <InputNumber value={stepsA} onChange={(value) => value && setStepsA(value)}/>
                    <InputNumber value={stepsB} onChange={(value) => value && setStepsB(value)}/>
                    <InputNumber value={stepsC} onChange={(value) => value && setStepsC(value)}/>
                    <InputNumber value={stepsD} onChange={(value) => value && setStepsD(value)}/>
                </div>
                {tokens.length > 0 && <div>
                    <input type={"checkbox"}
                           checked={doAudioToAudio}
                           onChange={(e) => setDoAudioToAudio(e.target.checked)}/>
                    Do Audio-To-Audio
                </div>}
                {tokens.length > 0 && doAudioToAudio &&
                    <div className={"initial-timesteps"}>Initial timesteps:
                        <input type="number" value={initialTimestepA} step={"0.01"}
                               onChange={(e) => setInitialTimestepA(e.target.valueAsNumber)}/>
                        <input type="number" value={initialTimestepB} step={"0.01"}
                               onChange={(e) => setInitialTimestepB(e.target.valueAsNumber)}/>
                        <input type="number" value={initialTimestepC} step={"0.01"}
                               onChange={(e) => setInitialTimestepC(e.target.valueAsNumber)}/>
                        <input type="number" value={initialTimestepD} step={"0.01"}
                               onChange={(e) => setInitialTimestepD(e.target.valueAsNumber)}/>
                    </div>
                }
                {generationUuid && progress && <progress value={progress}/>}
                {generationUuid && <button onClick={cancelGeneration}>Cancel</button>}
                {!generationUuid && <button onClick={generate}>Generate</button>}
            </div>
            <button onClick={() => setCachedTokens(tokens)}>Save</button>
            {cachedTokens && <button onClick={() => setTokens(cachedTokens)}>Restore</button>}
            {tokens && cachedTokens && <button onClick={() => doInterpolate()}>Interpolate current to saved</button>}
            <TokensGrid data={tokens} width={1024}/>
            <button onClick={decode}>Decode</button>
            {workingAudioBuffer && <WavesurferPanel id={"working"} audioBuffer={workingAudioBuffer}/>}

            <div>
                <ConnectionManager/>
                <div>is connected: {isConnected ? "1" : "0"}</div>
            </div>
        </>
    )

}

export default MAGNeTMutate;