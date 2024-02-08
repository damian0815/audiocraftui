import {Sampler, ToneAudioBuffer} from "tone";
import {useEffect, useRef, useState} from "react";
import GrooveMP3 from "./assets/groove.mp3"

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

export function AudioLoader() {

    function loadAudio() {
        const buffer = new ToneAudioBuffer(
            soundURL.href,
            () => {
                console.log("loaded");
        });
    }

    return <GrooveSamplePlayer />

}

