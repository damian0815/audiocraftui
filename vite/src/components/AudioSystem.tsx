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

    const onPlayPause = () => {
        console.log('onPlayPause: wavesurfer is', wavesurfer)
        wavesurfer && wavesurfer.playPause()
    }

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




export function AudioSystem() {

    const [tokens, setTokens] = useState<number[][]>([[]])
    const [usedAudio, setUsedAudio] = useState<ToneAudioBuffer|undefined>(undefined)
    const [usedAudioBlobURL, setUsedAudioBlobURL] = useState<string|undefined>()

    useEffect(() => {
        if (usedAudio) {
            console.log("setting usedAudioBlobURL for", usedAudio)
            const audioBlob = new Blob([audioBufferToWav(usedAudio.get()!)], {type: "audio/wav"})
            setUsedAudioBlobURL(URL.createObjectURL(audioBlob))
        }
    }, [usedAudio])

    async function onAudioLoaded(buffer: ToneAudioBuffer) {
        console.log("onAudioLoaded, buffer is:", buffer)
        const usedAudio = audiocraft.tokenize(buffer, (tokens) => {
            setTokens(tokens)
        })
        setUsedAudio(usedAudio)
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
        { usedAudioBlobURL && <WavesurferPanel url={usedAudioBlobURL} /> }
    </div>

}