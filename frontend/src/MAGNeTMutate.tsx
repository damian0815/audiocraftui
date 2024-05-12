
import { socket } from './system/socket.ts'
import {ConnectionManager} from "./components/ConnectionManager.tsx";
import {useEffect, useState} from "react";
import {TokensGrid} from "./components/TokensGrid.tsx";

import {Audiocraft, GenerationOptions, interpolateTokens} from './system/Audiocraft.tsx';
import {WavesurferPanel} from "./components/WavesurferPanel.tsx";
import {ToneAudioBuffer} from "tone";
import InputNumber from "rc-input-number";

import "./MAGNeTMutate.css"
import {GenerationHistory} from "./components/GenerationHistory.tsx";

function MAGNeTMutate() {

    const audiocraft = Audiocraft.getInstance(socket, 'magnet')

    const [isConnected, setIsConnected] = useState(socket.connected);
    const [tokens, setTokens] = useState<number[][]>([]);
    const [cachedTokens, setCachedTokens] = useState<number[][]|undefined>();

    const [generationUuid, setGenerationUuid] = useState<string|undefined>()
    const [progress, setProgress] = useState<number|undefined>()

    const [prompt, setPrompt] = useState<string>("");
    const [negativePrompt, setNegativePrompt] = useState<string|null>(null);
    const [steps, setSteps] = useState([20, 10, 10, 10])
    const [seed, setSeed] = useState<number>(0);
    const [useSampling, setUseSampling] = useState<boolean>(true);
    const [temperature, setTemperature] = useState<number>(3);
    const [topP, setTopP] = useState<number>(0.9);
    const [topK, setTopK] = useState<number>(0);
    const [maxCFGCoef, setMaxCFGCoef] = useState<number>(10.0);
    const [minCFGCoef, setMinCFGCoef] = useState<number>(1.0);
    const [maskingStrategy, setMaskingStrategy] = useState("default");
    const [maskingOptions, setMaskingOptions] = useState({})
    const textToAudioMaskingStrategies = ["default", "wandering"]
    const audioToAudioMaskingStrategies = ["periodicFixed", "periodicWandering", "periodicSwap"]


    const [doAudioToAudio, setDoAudioToAudio] = useState<boolean>(false);

    const [initialMaskPct, setInitialMaskPct] = useState([0, 0, 0, 0]);
    const [finalMaskPct, setFinalMaskPct] = useState([1, 1, 1, 1]);


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
            console.log("onFooResponseEvent", value)
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

    function buildGenerationOptions(): GenerationOptions {
        const options = new GenerationOptions()
        options.prompt = prompt
        options.negativePrompt = negativePrompt
        options.seed = seed
        options.steps = steps
        options.initialTokens = (doAudioToAudio ? tokens : null)
        options.initialMaskPct = (doAudioToAudio ? initialMaskPct : null)
        options.finalMaskPct = (doAudioToAudio ? finalMaskPct : null)
        options.temperature = temperature
        options.useSampling = useSampling
        options.topP = topP
        options.topK = topK
        options.maxCFGCoef = maxCFGCoef
        options.minCFGCoef = minCFGCoef
        options.maskingStrategy = maskingStrategy
        options.maskingOptions = maskingOptions
        return options
    }

    function generate() {
        if (prompt.trim().length > 0) {
            console.log(`sending generate with prompt '${prompt}'`)

            function callback(progressPct: number, tokens: [][]) {

                if (!tokens) {
                    setGenerationUuid(undefined)
                    return
                }
                setProgress(progressPct);
                //console.log("generate progress tokens:", tokens);
                setTokens(tokens);

                if (progressPct == 1) {
                    setGenerationUuid(undefined)
                }
            }

            const generationOptions = buildGenerationOptions()

            const uuid = audiocraft!.generate(
                generationOptions,
                callback,
            )

            setProgress(0.000001);
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
        const newTokens: number[][] = [];
        const numSteps = 10;
        const tokenSpanWidth = totalTokenLength / numSteps;
        for (let i=0; i<numSteps; i++) {
            console.log("interpolation step", i)
            const alpha = (i/(numSteps-1));
            const firstIndex = i * tokenSpanWidth;
            const lastIndex = (i+1) * tokenSpanWidth;
            const tokensSlice = tokens.map((v) => v.slice(firstIndex, lastIndex))
            const cachedTokensSlice = cachedTokens!.map((v) => v.slice(firstIndex, lastIndex))
            console.log('doing interpolation...')
            const interpolatedSlice = interpolateTokens(tokensSlice, cachedTokensSlice, alpha)
            console.log('writing to newTokens...')
            for (let j=0; j<tokens.length; j++) {
                if (i==0) {
                    newTokens.push([])
                }
                newTokens[j].push(...interpolatedSlice[j])
            }
        }
        setTokens(newTokens)
    }

    function useAll(options: GenerationOptions) {
        console.log("setting options:", options)
        setPrompt(options.prompt)
        setNegativePrompt(options.negativePrompt)
        setSeed(options.seed)
        setSteps(options.steps)
        setTemperature(options.temperature)
        if (options.initialTokens) {
            setDoAudioToAudio(true)
            setTokens(options.initialTokens)
            setInitialMaskPct(options.initialMaskPct!)
            setFinalMaskPct(options.finalMaskPct!)
        } else {
            setDoAudioToAudio(false)
        }
        if (options.useSampling) {
            setUseSampling(true)
            setTemperature(options.temperature)
            setTopK(options.topK)
            setTopP(options.topP)
        } else {
            setUseSampling(false)
        }
        setMaxCFGCoef(options.maxCFGCoef)
        setMinCFGCoef(options.minCFGCoef)
    }

    function getAvailableMaskingStrategies(doAudioToAudio: boolean) {
        if (doAudioToAudio) {
            return textToAudioMaskingStrategies.concat(audioToAudioMaskingStrategies)
        } else {
            return textToAudioMaskingStrategies
        }
    }

    return (
        <>
            <h1>MAGNeT Mutation</h1>
            <div>
                <div>
                    <textarea value={prompt} placeholder={"prompt"} onChange={
                        (e) => setPrompt(
                            e.target.value
                        )}>{prompt}</textarea>
                </div>
                <div>
                    <textarea value={negativePrompt} placeholder={"negative prompt"} onChange={
                        (e) => setNegativePrompt(
                            (e.target.value.length > 0) ? e.target.value : null
                        )}>{negativePrompt}</textarea>
                </div>
                <div className={"inline-input-number"}>Seed:
                    <InputNumber className={"inline-input-number-80"} value={seed} onChange={(value) => value && setSeed(value)}/>
                    <div className={"inline-input-number"}>CFG coefficients:
                        Max <InputNumber value={maxCFGCoef} step={"0.1"}
                                         onChange={(value) => value && setMaxCFGCoef(value)}/>
                        Min <InputNumber value={minCFGCoef} step={"0.1"}
                                         onChange={(value) => value && setMinCFGCoef(value)}/>
                    </div>
                    <div className={"inline-input-number"}>Steps:
                        <InputNumber value={steps[0]}
                                     onChange={(value) => value && setSteps([value, steps[1], steps[2], steps[3]])}/>
                        <InputNumber value={steps[1]}
                                     onChange={(value) => value && setSteps([steps[0], value, steps[2], steps[3]])}/>
                        <InputNumber value={steps[2]}
                                     onChange={(value) => value && setSteps([steps[0], steps[1], value, steps[3]])}/>
                        <InputNumber value={steps[3]}
                                     onChange={(value) => value && setSteps([steps[0], steps[1], steps[2], value])}/>
                    </div>
                </div>
                <div className={"inline-input-number"}>
                    Use sampling:
                    <input type={"checkbox"}
                           style={{width: '20px'}}
                           checked={useSampling}
                           onChange={(e) => setUseSampling(e.target.checked)}
                    />
                    {useSampling && <div className={"inline-input-number"}>
                        Temperature: <InputNumber value={temperature} step={"0.1"}
                                                  onChange={(value) => value && setTemperature(value)}/>
                        Top P: <InputNumber value={topP} step={"0.1"} onChange={(value) => value && setTopP(value)}/>
                        Top K: <InputNumber value={topK} onChange={(value) => value && setTopK(value)}/>
                    </div>}
                </div>

                <div>Masking strategy:
                    <select name={"mask-strategy"} value={maskingStrategy} onChange={(e) => setMaskingStrategy(e.target.value)}>
                        {getAvailableMaskingStrategies(doAudioToAudio).map((s) =>
                            <option value={s} key={s}>{s}</option>
                        )}
                    </select>
                </div>

                {tokens.length > 0 && <div>
                    Do audio-to-audio:
                    <input type={"checkbox"}
                           checked={doAudioToAudio}
                           style={{width: '20px'}}
                           onChange={(e) => setDoAudioToAudio(e.target.checked)}/>
                </div>}
                {tokens.length > 0 && doAudioToAudio &&
                    <div>Mask percents:
                        <div className={"mask-pcts"}>Initial:
                            <input type="number" value={initialMaskPct[0]} step={"0.01"}
                                   onChange={(e) => setInitialMaskPct([e.target.valueAsNumber, initialMaskPct[1], initialMaskPct[2], initialMaskPct[3]])}/>
                            <input type="number" value={initialMaskPct[1]} step={"0.01"}
                                   onChange={(e) => setInitialMaskPct([initialMaskPct[0], e.target.valueAsNumber, initialMaskPct[2], initialMaskPct[3]])}/>
                            <input type="number" value={initialMaskPct[2]} step={"0.01"}
                                   onChange={(e) => setInitialMaskPct([initialMaskPct[0], initialMaskPct[1], e.target.valueAsNumber, initialMaskPct[3]])}/>
                            <input type="number" value={initialMaskPct[3]} step={"0.01"}
                                   onChange={(e) => setInitialMaskPct([initialMaskPct[0], initialMaskPct[1], initialMaskPct[2], e.target.valueAsNumber])}/>
                        </div>
                        <div className={"mask-pcts"}>Final:
                            <input type="number" value={finalMaskPct[0]} step={"0.01"}
                                   onChange={(e) => setFinalMaskPct([e.target.valueAsNumber, finalMaskPct[1], finalMaskPct[2], finalMaskPct[3]])}/>
                            <input type="number" value={finalMaskPct[1]} step={"0.01"}
                                   onChange={(e) => setFinalMaskPct([finalMaskPct[0], e.target.valueAsNumber, finalMaskPct[2], finalMaskPct[3]])}/>
                            <input type="number" value={finalMaskPct[2]} step={"0.01"}
                                   onChange={(e) => setFinalMaskPct([finalMaskPct[0], finalMaskPct[1], e.target.valueAsNumber, finalMaskPct[3]])}/>
                            <input type="number" value={finalMaskPct[3]} step={"0.01"}
                                   onChange={(e) => setFinalMaskPct([finalMaskPct[0], finalMaskPct[1], finalMaskPct[2], e.target.valueAsNumber])}/>
                        </div>
                    </div>
                }
            </div>
            {generationUuid && progress && <progress value={progress}/>}
            {generationUuid && <button onClick={cancelGeneration}>Cancel</button>}
            {!generationUuid && <button onClick={generate}>Generate</button>}

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

            <GenerationHistory useAll={useAll}/>
        </>
    )

}

export default MAGNeTMutate;