
import { socket } from './system/socket.ts'
import {ConnectionManager} from "./components/ConnectionManager.tsx";
import {useContext, useEffect, useState} from "react";
import {TokensGrid} from "./components/TokensGrid.tsx";

import {Audiocraft, GenerationOptions, interpolateTokens} from './system/Audiocraft.tsx';
import {WavesurferPanel} from "./components/WavesurferPanel.tsx";
import {ToneAudioBuffer} from "tone";
import InputNumber from "rc-input-number";

import "./MAGNeTMutate.css"
import {GenerationHistory} from "./components/GenerationHistory.tsx";
import {ServerContext} from "./components/ServerContext.tsx";

function MAGNeTMutate() {

    const audiocraft = Audiocraft.getInstance(socket, 'magnet')
    const serverInfo = useContext(ServerContext)

    const [isConnected, setIsConnected] = useState(socket.connected);
    const [tokens, setTokens] = useState<number[][]>([]);

    const [generationUuid, setGenerationUuid] = useState<string|undefined>()
    const [progress, setProgress] = useState<number|undefined>()

    const [prompt, setPrompt] = useState<string>("");
    const [negativePrompt, setNegativePrompt] = useState<string>("");
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

    const [initialMaskPcts, setInitialMaskPcts] = useState([0, 0, 0, 0]);
    const [finalMaskPcts, setFinalMaskPcts] = useState([1, 1, 1, 1]);


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
        options.useSampling = useSampling
        options.topP = topP
        options.topK = topK
        options.temperature = temperature
        options.initialTokens = (doAudioToAudio ? tokens : null)
        options.initialMaskPcts = (doAudioToAudio ? initialMaskPcts : null)
        options.finalMaskPcts = (doAudioToAudio ? finalMaskPcts : null)
        options.maxCfgCoef = maxCFGCoef
        options.minCfgCoef = minCFGCoef
        options.maskingStrategy = maskingStrategy
        options.maskingOptions = maskingOptions
        return options
    }

    function loadAudio(uuid: string) {
        const url = serverInfo.baseUrl + "/audio/" + uuid
        ToneAudioBuffer.fromUrl(url)
            .then(b => setWorkingAudioBuffer(b))
    }

    function loadTokens(tokens: number[][]) {
        console.log('loading tokens', tokens)
        setTokens(tokens)
    }

    function generate() {
        if (prompt.trim().length > 0) {
            console.log(`sending generate with prompt '${prompt}'`)

            function progressCallback(progressPct: number, tokens: [][]) {

                if (!tokens) {
                    setGenerationUuid(undefined)
                    return
                }
                setProgress(progressPct);
                //console.log("generate progress tokens:", tokens);
                setTokens(tokens);
            }

            function completionCallback(tokens: [][]) {
                setGenerationUuid(undefined)
                setTokens(tokens);
                loadAudio(uuid)
            }

            const generationOptions = buildGenerationOptions()

            const uuid = audiocraft!.generate(
                generationOptions,
                progressCallback,
                completionCallback
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
            setInitialMaskPcts(options.initialMaskPcts!)
            setFinalMaskPcts(options.finalMaskPcts!)
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
        console.log("setting max/min CFG Coef", options.maxCfgCoef, options.minCfgCoef)
        setMaxCFGCoef(options.maxCfgCoef)
        setMinCFGCoef(options.minCfgCoef)
    }

    function getAvailableMaskingStrategies(doAudioToAudio: boolean) {
        if (doAudioToAudio) {
            return textToAudioMaskingStrategies.concat(audioToAudioMaskingStrategies)
        } else {
            return textToAudioMaskingStrategies
        }
    }

    return (
        <div className={"magnet-mutate-page"}>
            <div className={"main-ui"}>
                <h1>MAGNeT Mutation</h1>
                <div>
                    <textarea value={prompt} placeholder={"prompt"} onChange={
                        (e) => setPrompt(
                            e.target.value
                        )}>{prompt}</textarea>
                </div>
                <div>
                    <textarea value={negativePrompt} placeholder={"negative prompt"} onChange={
                        (e) => setNegativePrompt(e.target.value)}>{negativePrompt}</textarea>
                </div>
                <div className={"inline-input-number"}>Seed:
                    <InputNumber className={"inline-input-number-80"} value={seed}
                                 onChange={(value) => value && setSeed(value)}/>
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
                    <select name={"mask-strategy"} value={maskingStrategy}
                            onChange={(e) => setMaskingStrategy(e.target.value)}>
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
                            <input type="number" value={initialMaskPcts[0]} step={"0.01"}
                                   onChange={(e) => setInitialMaskPcts([e.target.valueAsNumber, initialMaskPcts[1], initialMaskPcts[2], initialMaskPcts[3]])}/>
                            <input type="number" value={initialMaskPcts[1]} step={"0.01"}
                                   onChange={(e) => setInitialMaskPcts([initialMaskPcts[0], e.target.valueAsNumber, initialMaskPcts[2], initialMaskPcts[3]])}/>
                            <input type="number" value={initialMaskPcts[2]} step={"0.01"}
                                   onChange={(e) => setInitialMaskPcts([initialMaskPcts[0], initialMaskPcts[1], e.target.valueAsNumber, initialMaskPcts[3]])}/>
                            <input type="number" value={initialMaskPcts[3]} step={"0.01"}
                                   onChange={(e) => setInitialMaskPcts([initialMaskPcts[0], initialMaskPcts[1], initialMaskPcts[2], e.target.valueAsNumber])}/>
                        </div>
                        <div className={"mask-pcts"}>Final:
                            <input type="number" value={finalMaskPcts[0]} step={"0.01"}
                                   onChange={(e) => setFinalMaskPcts([e.target.valueAsNumber, finalMaskPcts[1], finalMaskPcts[2], finalMaskPcts[3]])}/>
                            <input type="number" value={finalMaskPcts[1]} step={"0.01"}
                                   onChange={(e) => setFinalMaskPcts([finalMaskPcts[0], e.target.valueAsNumber, finalMaskPcts[2], finalMaskPcts[3]])}/>
                            <input type="number" value={finalMaskPcts[2]} step={"0.01"}
                                   onChange={(e) => setFinalMaskPcts([finalMaskPcts[0], finalMaskPcts[1], e.target.valueAsNumber, finalMaskPcts[3]])}/>
                            <input type="number" value={finalMaskPcts[3]} step={"0.01"}
                                   onChange={(e) => setFinalMaskPcts([finalMaskPcts[0], finalMaskPcts[1], finalMaskPcts[2], e.target.valueAsNumber])}/>
                        </div>
                    </div>
                }
                {generationUuid && progress && <progress value={progress}/>}
                {generationUuid && <button onClick={cancelGeneration}>Cancel</button>}
                {!generationUuid && <button onClick={generate}>Generate</button>}

                <TokensGrid data={tokens} width={1024}/>
                <button onClick={decode}>Decode</button>
                {workingAudioBuffer && <WavesurferPanel id={"working"} audioBuffer={workingAudioBuffer}/>}

                <div>
                    <ConnectionManager/>
                    <div>is connected: {isConnected ? "1" : "0"}</div>
                </div>
            </div>
            <div className={"generation-history"}>
                <GenerationHistory useAll={useAll} loadAudio={loadAudio} loadTokens={loadTokens}/>
            </div>
        </div>
    )

}

export default MAGNeTMutate;