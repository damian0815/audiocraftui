import { v4 as uuid } from 'uuid'
import {socket as Socket} from "./socket.ts";
import {ToneAudioBuffer} from "tone";

import { encode, Encoder } from "msgpack-ts"

function platformIsLittleEndian() {
    var arrayBuffer = new ArrayBuffer(2);
    var uint8Array = new Uint8Array(arrayBuffer);
    var uint16array = new Uint16Array(arrayBuffer);
    uint8Array[0] = 0xAA; // set first byte
    uint8Array[1] = 0xBB; // set second byte
    if(uint16array[0] === 0xBBAA) return true;
    if(uint16array[0] === 0xAABB) return false;
    else throw new Error("Something crazy just happened");
}

export class Audiocraft {
    private socket: typeof Socket;
    private requestCallbackStorage: Map<String, (x: any) => void> = new Map();
    private maxLengthSeconds = 4.0

    constructor(socket) {
        this.socket = socket

        const self=this
        this.socket.on('tokenizeResponse', function (ret) {
            console.log('got tokenizeResponse', ret)
            const uuid = ret['uuid']
            const tokens = ret['tokens']
            self._handleTokenizeResponse(uuid, tokens)
        })
    }

    tokenize(buffer: ToneAudioBuffer, callback: (x: any) => void) {
        console.log("as array:")
        const bufferArray = buffer.slice(0, this.maxLengthSeconds).toArray(0)
        console.log(bufferArray)
        const requestUuid = uuid()
        this.requestCallbackStorage.set(requestUuid, callback)
        console.log('callbacks:', this.requestCallbackStorage)
        //console.log("emitting silly foo event")
        //this.socket.emit("foo")
        console.log('now emitting "tokenize" on', this.socket, "with", bufferArray)

        this.socket.emit('tokenize', {
            'uuid': requestUuid,
            'audioFloat32Bytes': bufferArray.buffer,
            'audioIsLittleEndian': platformIsLittleEndian(),
            'sample_rate': buffer.sampleRate
        })
    }

    _handleTokenizeResponse(uuid: string, tokens: any) {
        console.log('in tokenizeResponse handler: tokens:',tokens, 'callbacks:', this.requestCallbackStorage)
        const callback = this.requestCallbackStorage.get(uuid)
        if (callback) {
            callback(tokens)
            this.requestCallbackStorage.delete(uuid)
        } else {
            console.log('no registered callback for', uuid)
        }
    }

}