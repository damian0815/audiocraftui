import {useEffect} from "react";
import WaveSurfer from "wavesurfer.js";
import {Tone, ToneAudioBuffer} from "tone";
import {AudioLoader} from "./AudioLoader.tsx";

const waveSurferInstance = WaveSurfer.create({
    audioContext: Tone.getContext().rawContext._nativeAudioContext
// ...other options etc.
})

export function AudioInterface() {

    function displayWaveform(toneBuffer: ToneAudioBuffer) {
        const url = URL.createObjectURL(new Blob([toneBuffer.get()], {type: 'audio/wav'}))
        const peaks = [toneBuffer.get().getChannelData(0), toneBuffer.get().getChannelData(1)]
        const duration = toneBuffer.get().duration

        wavesurfer.load(url, peaks, duration)
    }

    <AudioLoader />

}



