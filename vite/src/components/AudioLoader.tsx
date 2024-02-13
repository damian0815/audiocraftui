import {Sampler, ToneAudioBuffer, context as ToneContext} from "tone";
import {useCallback, useEffect, useRef, useState} from "react";
import GrooveMP3 from "../assets/groove.mp3"
import {useDropzone} from 'react-dropzone'

export function GrooveSamplePlayer() {

    const [isLoaded, setLoaded] = useState(false);
    const sampler = useRef(null);

    useEffect(() => {
        sampler.current = new Sampler(
            { 'C1': GrooveMP3 },
            () => {
                console.log("loaded ddd")
                    setLoaded(true);
                }
        ).toDestination();
    }, []);


    const handleClick = () => sampler.current.triggerAttack("A1");

    return (
        <div>
            <button disabled={!isLoaded} onClick={handleClick}>
                start
            </button>
        </div>
    );
}


export function AudioFileDropZone({gotFile} : {gotFile: (file: File) => void}) {

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Do something with the files
        gotFile(acceptedFiles[0])
    }, [])
    const {getRootProps, getInputProps, isDragActive} = useDropzone({
        onDrop: onDrop,
        maxFiles: 1,
        accept: {
            'audio/mpeg': ['.mp3'],
            'audio/wav': ['.wav'],
        }
    })

    return (
        <div {...getRootProps()}>
            <input {...getInputProps()} />
            {
                isDragActive ?
                    <p>Drop audio files here ...</p> :
                    <p>Drag 'n' drop audio files here, or click to select files</p>
            }
        </div>
    )
}


export function AudioLoader({loadedCallback}: {loadedCallback : (buffer: ToneAudioBuffer) => void }) {

    function loadAudio() {
        const buffer = new ToneAudioBuffer(
            soundURL.href,
            () => {
                console.log("loaded");
        });
    }

    function onAudioFileSelected(file: File) {
        console.log("got file: ", file)

        const reader = new FileReader()
        reader.onload = async function (ev) {
            console.log("read", file)
            const arrayBuffer = ev.target.result;
            console.log("decoding audio data from", arrayBuffer)
            const audioBuffer = await ToneContext.decodeAudioData(arrayBuffer)
            console.log("making ToneAudioBuffer for", audioBuffer)
            const toneBuffer = await new ToneAudioBuffer(
                audioBuffer
            )
            loadedCallback(toneBuffer);

        }
        reader.readAsArrayBuffer(file)
    }

    return <>
        <AudioFileDropZone gotFile={onAudioFileSelected} />
    </>

}

