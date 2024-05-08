import {ToneAudioBuffer} from "tone";
import {useEffect, useState} from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, {Region} from "wavesurfer.js/dist/plugins/regions";
import audioBufferToWav from "audiobuffer-to-wav";
import WavesurferPlayer from "@wavesurfer/react";

type WavesurferPanelProps = {
  audioBuffer: ToneAudioBuffer;
  id?: string;
  regionUpdated?: (buffer: ToneAudioBuffer, region: Region) => void;
}

export function WavesurferPanel(props: WavesurferPanelProps) {

    const [audioBuffer, setAudioBuffer] = useState<ToneAudioBuffer>(props.audioBuffer)
    const [audioBlobURL, setAudioBlobURL] = useState<string | undefined>()

    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    //const [wsRegions, setWsRegions] = useState<RegionsPlugin | undefined>(undefined)
    const [selectedRegion, setSelectedRegion] = useState<Region>(undefined)

    useEffect(() => {
        setAudioBuffer(props.audioBuffer)
    }, [props.audioBuffer]);

    useEffect(() => {
        console.log("WavesurferPanel " + props.id + ": audioBuffer useeffect")
        if (audioBuffer) {
            console.log("setting audioBlobURL for", audioBuffer)
            const audioBlob = new Blob([audioBufferToWav(audioBuffer.get()!)], {type: "audio/wav"})
            setAudioBlobURL(URL.createObjectURL(audioBlob))
        }
    }, [audioBuffer])


    const onReady = (ws: WaveSurfer) => {
        setWavesurfer(ws)
        setIsPlaying(false)

        if (props.regionUpdated) {

            const wsRegions = ws.registerPlugin(RegionsPlugin.create())
            // Create some regions at specific time ranges
            // Give regions a random color when they are created
            const random = (min: number, max: number) => {
                return Math.random() * (max - min) + min;
            }
            const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`

            // Regions
            wsRegions.addRegion({
                start: 1,
                end: 5,
                id: "chosen-region",
                content: undefined, // label
                color: randomColor(),
                minLength: 0.1,
                maxLength: 4,
                drag: true,
                resize: true,
            })

            wsRegions.on('region-updated', (region: Region) => {
                console.log('Updated region to ', region.start, '-', region.end)
                if (region.id === "chosen-region") {
                    props.regionUpdated(audioBuffer, region)
                } else {
                    setSelectedRegion(region)
                }
            })

            wsRegions.enableDragSelection({
                color: 'rgba(255, 0, 0, 0.1)',
            })

            const loop = false

            let activeRegion: Region = null
            wsRegions.on('region-in', (region: Region) => {
                console.log('region-in', region)
                activeRegion = region
            })
            wsRegions.on('region-out', (region: Region) => {
                console.log('region-out', region)
                if (activeRegion === region) {
                    if (loop) {
                        region.play()
                    } else {
                        ws.stop()
                        ws.seekTo(region.start)
                        activeRegion = null
                    }
                }
            })
            wsRegions.on('region-clicked', (region: Region, e: Event) => {
                e.stopPropagation() // prevent triggering a click on the waveform
                activeRegion = region
                region.play()
                region.setOptions({color: randomColor()})
            })
            // Reset the active region when the user clicks anywhere in the waveform
            ws.on('interaction', () => {
                activeRegion = null
            })
        }
    }

    const onPlayPause = () => {
        wavesurfer && wavesurfer.playPause()
    }

    const trimToSelected = () => {
        selectedRegion && audioBuffer && setAudioBuffer(audioBuffer.slice(selectedRegion.start, selectedRegion.end))
    }

    //console.log("audio blob URL has length", audioBlobURL?.length)

    return (
        <>
            <WavesurferPlayer
                height={100}
                waveColor="violet"
                url={audioBlobURL}
                onReady={onReady}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            <button onClick={onPlayPause}>
                {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button onClick={trimToSelected}>
                Trim to selection
            </button>
        </>
    )


    //console.log("rendering wavesurferInstance panel, containerRef is", containerRef)


    /*
    useEffect(() => {
        console.log('wavesurfer', wavesurferInstance, 'isReady', wavesurferInstance.)




    }, [wavesurferInstance])*/
}