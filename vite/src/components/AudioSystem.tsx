import {AudioLoader} from "./AudioLoader.tsx";
import {ToneAudioBuffer} from "tone";
import {socket} from '../system/socket.ts'
import {Audiocraft} from '../system/Audiocraft.tsx';
import {TokensGrid} from "./TokensGrid.tsx";
import {useEffect, useRef, useState} from "react";
import {debounce} from "../system/debounce.ts";
import {WavesurferPanel} from "./WavesurferPanel.tsx";
import {Region} from "wavesurfer.js/dist/plugins/regions";
import ReactSlider from "react-slider";
import {cloneArray} from "../system/cloneArray.tsx";
import {shuffle} from "../system/seedRandom.ts"

const audiocraft = new Audiocraft(socket)

function useTraceUpdate(props) {
  const prev = useRef(props);
  useEffect(() => {
    const changedProps = Object.entries(props).reduce((ps, [k, v]) => {
      if (prev.current[k] !== v) {
        ps[k] = [prev.current[k], v];
      }
      return ps;
    }, {});
    if (Object.keys(changedProps).length > 0) {
      console.log('Changed props:', changedProps);
    }
    prev.current = props;
  });
}


class AudioRegion {
    start: number = 0
    end: number = 0
    constructor(start: number, end: number) {
        this.start = start
        this.end = end
    }
    duration() { return this.end - this.start }
}

const MAX_DURATION = 4

export function AudioSystem() {

    const [tokens, setTokens] = useState<number[][][]>([[[]], [[]]])
    const [workingTokens, setWorkingTokens] = useState<number[][]>([[]])
    const [workingAudioBuffer, setWorkingAudioBuffer] = useState<ToneAudioBuffer|undefined>()
    const [sourceAudioBuffer, setSourceAudioBuffer] = useState<ToneAudioBuffer|undefined>(undefined)
    const [sourceAudioRegion, setSourceAudioRegion] = useState<AudioRegion|undefined>(undefined)
    const [randomSeed, setRandomSeed] = useState(100)
    const [slidersLinked, setSlidersLinked] = useState(true)

    /*
    useEffect(() => {
        console.log("sourceAudioBuffer", sourceAudioBuffer, "range", sourceAudioRegion)
        if (sourceAudioBuffer && sourceAudioRegion && sourceAudioRegion.duration() <= MAX_DURATION) {
            console.log("-> requesting tokenization")
            audiocraft.tokenize(sourceAudioBuffer!.slice(sourceAudioRegion.start, sourceAudioRegion.end)!, (tokens) => {

                setTokens(tokens)
            })
        }
    }, [sourceAudioBuffer, sourceAudioRegion])*/

    function sendAudioRegionToTokens(whichTokens: number) {
        console.log("sending region", sourceAudioRegion, "from buffer", sourceAudioBuffer, "to tokens", whichTokens)
        if (sourceAudioBuffer && sourceAudioRegion && sourceAudioRegion.duration() <= MAX_DURATION) {
            const newAllTokens: number[][][] = cloneArray(tokens) as number[][][]
            const thisAudioBuffer= sourceAudioBuffer.slice(sourceAudioRegion.start, sourceAudioRegion.end)!
            console.log("-> requesting tokenization")
            audiocraft.tokenize(thisAudioBuffer, (tokens) => {
                newAllTokens[whichTokens] = tokens
                setTokens(newAllTokens)
            })
        }
    }

    async function onAudioLoaded(buffer: ToneAudioBuffer) {
        console.log("onAudioLoaded, buffer is:", buffer)
        setSourceAudioRegion(new AudioRegion(0, 4))
        setSourceAudioBuffer(buffer)
    }

    function debouncedDetokenize(tokens: number[][], desiredSampleRate: number, callback: (x: any) => void) {
        debounce(() => {
            audiocraft.detokenize(tokens, desiredSampleRate, callback)
        }, 1000)()
    }

    async function onWorkingTokensModified(newTokens: number[][]) {
        setWorkingTokens(cloneArray(newTokens) as number[][])
    }

    useEffect(() => {
        console.log("onTokensModified, new tokens are:", workingTokens)
        debouncedDetokenize(workingTokens, ToneAudioBuffer.prototype.sampleRate, (audioFloats: Float32Array) => {
            const audio = ToneAudioBuffer.fromArray(audioFloats)
            console.log("detokenized to", audio, "buffer", audio.get(), "->assigning to workingAudioBuffer")
            setWorkingAudioBuffer(audio)
        })
    }, [workingTokens])

    function onSourceRegionUpdated(buffer: ToneAudioBuffer, region: Region) {
        console.log("region updated to", region.start, "-", region.end)
        setSourceAudioRegion(new AudioRegion(region.start, region.end))
        setSourceAudioBuffer(buffer)
    }

    function onMixerSliderChanged(whichChannel: number, value: number, thumbIndex: number) {
        const numChannels = tokens[0].length
        const countPerChannel = Math.min(tokens[0][whichChannel].length, tokens[1][whichChannel].length)
        const cutoffIndex = (value/100) * countPerChannel
        const newWorkingTokens: number[][] = cloneArray(workingTokens) as number[][]

        for (let i=0; i<numChannels; i++) {
            if (slidersLinked || i == whichChannel) {
                const sequence: number[] = shuffle(Array.from(Array(countPerChannel).keys()), randomSeed + i) as number[]
                sequence.forEach((sourceIndex, sequenceIndex) => {
                    //console.log("channel:", channel, "sourceIndex:", sourceIndex)
                    if (sequenceIndex > cutoffIndex) {
                        newWorkingTokens[i][sourceIndex] = tokens[0][i][sourceIndex]
                    } else {
                        newWorkingTokens[i][sourceIndex] = tokens[1][i][sourceIndex]
                    }
                })
            }
        }
        setWorkingTokens(newWorkingTokens)
    }

    return <div className="audiosystem">
        <AudioLoader loadedCallback={ onAudioLoaded }/>
        { sourceAudioBuffer && <WavesurferPanel id={"source"} audioBuffer={sourceAudioBuffer} regionUpdated={onSourceRegionUpdated} /> }
        <button onClick={()=>{ sendAudioRegionToTokens(0) }}>
            Send to tokens 1
        </button>
        <button onClick={()=>{ sendAudioRegionToTokens(1) }}>
            Send to tokens 2
        </button>

        <h2>Tokens 1</h2>
        <TokensGrid data={tokens[0]} />
        <h2>Tokens 2</h2>
        <TokensGrid data={tokens[1]} />
        <h2>Working tokens</h2>

        <button onClick={() => { setWorkingTokens(cloneArray(tokens[0]) as number[][])} } >
            Take tokens 1
        </button>
        <button onClick={() => { setWorkingTokens(cloneArray(tokens[1]) as number[][])} } >
            Take tokens 2
        </button>

        <label>
            <input type="checkbox" onChange={(e) => setSlidersLinked(e.target.checked)} />
        </label>
        <ReactSlider
                className="horizontal-slider"
                thumbClassName="example-thumb"
                trackClassName="example-track"
                renderThumb={(props, state) => <div {...props}>{state.valueNow}</div>}
                onAfterChange={(value, index) => onMixerSliderChanged(0, value, index)}
        />
        { !slidersLinked && <>
            <ReactSlider
                    className="horizontal-slider"
                    thumbClassName="example-thumb"
                    trackClassName="example-track"
                    renderThumb={(props, state) => <div {...props}>{state.valueNow}</div>}
                    onAfterChange={(value, index) => onMixerSliderChanged(1, value, index)} />
            <ReactSlider
                    className="horizontal-slider"
                    thumbClassName="example-thumb"
                    trackClassName="example-track"
                    renderThumb={(props, state) => <div {...props}>{state.valueNow}</div>}
                    onAfterChange={(value, index) => onMixerSliderChanged(2, value, index)} />
            <ReactSlider
                    className="horizontal-slider"
                    thumbClassName="example-thumb"
                    trackClassName="example-track"
                    renderThumb={(props, state) => <div {...props}>{state.valueNow}</div>}
                    onAfterChange={(value, index) => onMixerSliderChanged(3, value, index)} />
        </> }

        <label>Random seed:
            <input
                name="randomSeed"
                type="number"
                placeholder="100"
                value={randomSeed}
                onChange={(e) => setRandomSeed(+e.target.value)} />
        </label>

        <TokensGrid data={workingTokens} tokensModifiedCallback={
            (newTokens) => { onWorkingTokensModified(newTokens) }
        } />
        { workingAudioBuffer && <WavesurferPanel id={"working"} audioBuffer={workingAudioBuffer} />}

    </div>

}