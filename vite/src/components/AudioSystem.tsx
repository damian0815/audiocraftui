import {AudioLoader} from "./AudioLoader.tsx";
import {ToneAudioBuffer} from "tone";
import { socket } from '../system/socket.ts'
import { Audiocraft } from '../system/Audiocraft.tsx';
import {TokensGrid} from "./TokensGrid.tsx";
import {useState} from "react";

const audiocraft = new Audiocraft(socket)

export function AudioSystem() {

    const [tokens, setTokens] = useState<number[][]>([[]])

    function onAudioLoaded(buffer: ToneAudioBuffer) {
        console.log("onAudioLoaded, buffer is:", buffer)
        audiocraft.tokenize(buffer, (tokens) => {
            setTokens(tokens)
        })
    }

    return <>
        <AudioLoader loadedCallback={onAudioLoaded}/>
        <TokensGrid data={tokens}/>
    </>


}