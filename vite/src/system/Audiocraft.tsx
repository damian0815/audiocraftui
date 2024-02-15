import { v4 as uuid } from 'uuid'
import {socket as Socket} from "./socket.ts";
import {ToneAudioBuffer} from "tone";

import { encode, Encoder } from "msgpack-ts"
import {call} from "audiobuffer-to-wav";
import {type} from "os";

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

function swapBytes32InPlace(buf) {
    var bytes = new Uint8Array(buf);
    var len = bytes.length;
    var holder;

    // 32 bit
    for (var i = 0; i<len; i+=4) {
        holder = bytes[i];
        bytes[i] = bytes[i+3];
        bytes[i+3] = holder;
        holder = bytes[i+1];
        bytes[i+1] = bytes[i+2];
        bytes[i+2] = holder;
    }
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

        this.socket.on('detokenizeResponse', function (ret) {
            console.log('got detokenizeResponse', ret)
            const uuid = ret['uuid']
            const audio_float32_bytes = ret['audioFloat32Bytes']
            const is_little_endian = ret['audioIsLittleEndian']
            const sample_rate = ret['sample_rate']
            self._handleDetokenizeResponse(uuid, audio_float32_bytes, is_little_endian, sample_rate)
        })
    }

    tokenize(buffer: ToneAudioBuffer, callback: (x: any) => void): ToneAudioBuffer {
        console.log("tokenizing", buffer)
        const bufferSlice = buffer.slice(0, Math.min(buffer.duration, this.maxLengthSeconds))
        console.log("bufferSlice is :", bufferSlice)

        const bufferArray = bufferSlice.toArray(0)
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

        return bufferSlice
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

    detokenize(tokens: number[][], desiredSampleRate: number, callback: (x: any) => void) {
        const requestUuid = uuid()
        this.requestCallbackStorage.set(requestUuid, callback)
        this.socket.emit('detokenize', {
            'uuid': requestUuid,
            'tokens': tokens,
            'desiredSampleRate': desiredSampleRate
        })
    }

    _handleDetokenizeResponse(uuid: string, audioFloat32Bytes: ArrayBuffer, audioIsLittleEndian: boolean) {
        console.log('in detokenizeResponse handler: audio', audioFloat32Bytes)
        const callback = this.requestCallbackStorage.get(uuid)

        if (audioIsLittleEndian != platformIsLittleEndian()) {
            swapBytes32InPlace(audioFloat32Bytes)
        }

        const audio = new Float32Array(audioFloat32Bytes)
        //const audio =

        if (callback) {
            callback(audio)
            this.requestCallbackStorage.delete(uuid)
        } else {
            console.log('no registered callback for', uuid)
        }

    }



}