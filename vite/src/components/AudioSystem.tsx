import {AudioLoader} from "./AudioLoader.tsx";
import {ToneAudioBuffer} from "tone";
import { socket } from '../system/socket.ts'
import { Audiocraft } from '../system/Audiocraft.tsx';
import {TokensGrid} from "./TokensGrid.tsx";
import {useEffect, useState} from "react";
import {useWavesurfer} from '@wavesurfer/react'
import audioBufferToWav from 'audiobuffer-to-wav'

import { useRef } from 'react'
import GROOVE_MP3 from '../assets/groove.mp3'
import WaveSurfer from "wavesurfer.js";
import {debounce} from "../system/debounce.ts";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";

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

export function WavesurferPanel({url}: {url: string}) {

    const containerRef = useRef(null)

    //console.log("rendering wavesurfer panel, containerRef is", containerRef)

    const { wavesurfer, isReady, isPlaying, currentTime } = useWavesurfer({
        container: containerRef,
        url: url,
        waveColor: 'purple',
        height: 100
    })

    //console.log("wavesurfer panel:", wavesurfer, isReady)

    const onPlayPause = () => {
        console.log('onPlayPause: wavesurfer is', wavesurfer)
        wavesurfer && wavesurfer.playPause()
    }

    useEffect(() => {
        console.log('wavesurfer', wavesurfer, 'isReady', isReady)

        if (isReady) {
            // Initialize the Regions plugin
            const wsRegions = wavesurfer!.registerPlugin(RegionsPlugin.create())

            // Create some regions at specific time ranges
            // Give regions a random color when they are created
            const random = (min, max) => Math.random() * (max - min) + min
            const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`

            // Regions
            wsRegions.addRegion({
                start: 0,
                end: 0.8,
                content: 'Resize me',
                color: randomColor(),
                drag: false,
                resize: true,
            })
            wsRegions.addRegion({
                start: 0.9,
                end: 1,
                content: 'Cramped region',
                color: randomColor(),
                minLength: 0.1,
                maxLength: 1,
            })
            wsRegions.addRegion({
                start: 1.2,
                end: 1.7,
                content: 'Drag me',
                color: randomColor(),
                resize: false,
            })

            // Markers (zero-length regions)
            wsRegions.addRegion({
                start: 1.9,
                content: 'Marker',
                color: randomColor(),
            })
            wsRegions.addRegion({
                start: 2,
                content: 'Second marker',
                color: randomColor(),
            })
            wsRegions.enableDragSelection({
                color: 'rgba(255, 0, 0, 0.1)',
            })

            wsRegions.on('region-updated', (region) => {
                console.log('Updated region', region)
            })


        }

    }, [wavesurfer, isReady])



    return <div>
        <div ref={containerRef} />
        <button onClick={onPlayPause}>
            {isPlaying ? 'Pause' : 'Play'}
        </button>
    </div>

}

function cloneArray(items: any) {
    return items.map(item => Array.isArray(item) ? cloneArray(item) : item);
}


class AudioRegion {
    start: number = 0
    end: number = 0
    duration() { return this.end - this.start }
}

const MAX_DURATION = 1

export function AudioSystem() {

    const [tokens, setTokens] = useState<number[][]>([[]])
    const [audioBuffer, setAudioBuffer] = useState<ToneAudioBuffer|undefined>(undefined)
    const [range, setRange] = useState<AudioRegion|undefined>(undefined)
    const [audioBlobURL, setAudioBlobURL] = useState<string|undefined>()

    useEffect(() => {
        if (audioBuffer) {
            console.log("setting audioBlobURL for", audioBuffer)
            const audioBlob = new Blob([audioBufferToWav(audioBuffer.get()!)], {type: "audio/wav"})
            setAudioBlobURL(URL.createObjectURL(audioBlob))
        }
    }, [audioBuffer])


    useEffect(() => {
        if (audioBuffer && range && range.duration() < MAX_DURATION) {
            audiocraft.tokenize(audioBuffer!.slice(range.start, range.end)!, (tokens) => {
                setTokens(tokens)
            })
        }
    }, [audioBuffer, range])


    async function onAudioLoaded(buffer: ToneAudioBuffer) {
        console.log("onAudioLoaded, buffer is:", buffer)
        setRange(undefined)
        setAudioBuffer(buffer.slice(0, 4))
    }


    function debouncedDetokenize(tokens: any, desiredSampleRate: number, callback: any) {
        debounce(() => {
            audiocraft.detokenize(tokens, desiredSampleRate, callback)
        }, 1000)()
    }

    async function onTokensModified(newTokens: number[][]) {
        setTokens(cloneArray(newTokens))
        console.log("onTokensModified, new tokens are:", newTokens)
        debouncedDetokenize(newTokens, ToneAudioBuffer.prototype.sampleRate, (audioFloats) => {
            const audio = ToneAudioBuffer.fromArray(audioFloats)
            console.log("detokenized to", audio)
            console.log("buffer:", audio.get())
            setUsedAudio(audio)
        })
    }

    return <div className="audiosystem">
        <AudioLoader loadedCallback={ onAudioLoaded }/>
        <TokensGrid data={tokens} tokensModifiedCallback={ onTokensModified } />
        { audioBlobURL && <WavesurferPanel url={audioBlobURL} /> }
    </div>

}