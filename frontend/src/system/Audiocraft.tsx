import { v4 as uuid } from 'uuid'
import {socket as Socket} from "./socket.ts";
import {ToneAudioBuffer} from "tone";
import { cloneArray } from './cloneArray.tsx';


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

function swapBytes32InPlace(buf: any) {
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

export function interpolateTokens(a: number[][], b: number[][], alpha: number): number[][] {
    const result = new Array();
    //console.assert(a.length == b.length);
    for (var i=0; i<a.length; i++) {
        console.log("stage", i)
        //console.assert(a[i].length == b[i].length);
        result.push(a[i].map((v, j) => v * (1-alpha) + b[i][j] * alpha))
    }
    return result;
}

export class GenerationOptions {
    prompt: string = ""
    negativePrompt: string = ""
    seed: number = -1
    steps: number[] = [20, 10, 10, 10]
    useSampling: boolean = true
    topP: number = 0.9
    topK: number = 0
    temperature: number = 3
    initialTokens: number[][] | null = null
    initialMaskPct: number[] | null = null
    finalMaskPct: number[] | null = null
    minCFGCoef: number = 1
    maxCFGCoef: number = 10
}

export class Audiocraft {

    private static instance: Audiocraft|null = null;
    public static getInstance(socket, modelType) {
        if (Audiocraft.instance) {
            if (Audiocraft.instance.modelType != modelType) {
                console.error("model type mismatch, wanted", modelType, "have", Audiocraft.instance.modelType)
                return null
            }
        } else {
            Audiocraft.instance = new Audiocraft(socket, modelType);
        }
        return Audiocraft.instance;
    }

    private socket: typeof Socket;
    private modelType: String;
    private requestCallbackStorage: Map<String, (... args: any[]) => void> = new Map();
    private maxLengthSeconds = 4.0

    private constructor(socket: typeof Socket, modelType: String='musicgen') {
        this.socket = socket
        this.modelType = modelType

        console.log("in audiocraft constructor")

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
            // const is_little_endian = ret['audioIsLittleEndian']
            const sample_rate = ret['sample_rate']
            self._handleDetokenizeResponse(uuid, audio_float32_bytes, sample_rate)
        })

        this.socket.on('generateProgress', function (ret) {
            //console.log("got generateProgress", ret)
            const uuid = ret['uuid']
            const tokens = ret['tokens']
            const i = ret['i']
            const count = ret['count']
            self._handleGenerateProgress(uuid, i, count, tokens);
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
            'modelType': this.modelType,
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
            //console.log('no registered callback for', uuid)
        }
    }

    generate(options: GenerationOptions,
             callback: (progressPct: number, tokens: [][], masks: [][]) => void,
        ): string {
        const requestUuid = uuid()
        this.requestCallbackStorage.set(requestUuid, callback)
        console.log("generate request with prompt", options.prompt, "uuid", requestUuid)
        this.socket.emit('generate', {
            "model_type": this.modelType,
            "uuid": requestUuid,
            "parameters": {
                "seed": options.seed,
                "steps": options.steps,
                "prompt": options.prompt,
                "negative_prompt": options.negativePrompt,
                "min_cfg_coef": options.minCFGCoef,
                "max_cfg_coef": options.maxCFGCoef,
                "initial_mask_pcts": options.initialMaskPct,
                "final_mask_pcts": options.finalMaskPct,
                "initial_tokens": options.initialTokens,
                "temperature": options.temperature,
                "use_sampling": options.useSampling,
                "top_p": options.topP,
                "top_k": options.topK,
            }
        })
        return requestUuid
    }

    cancelGeneration(requestUuid: string) {
        this.socket.emit('cancelGeneration', {
            'uuid': requestUuid
        })
    }

    _handleGenerateProgress(uuid: string, stepNumber: number, totalSteps: number, tokens: any[], masks: any[]) {
        const callback = this.requestCallbackStorage.get(uuid)
        if (callback) {
            //console.log("generate callback with", tokens)
            if (!tokens) {
                callback(0, null)
                this.requestCallbackStorage.delete(uuid)
            } else {
                callback(stepNumber / totalSteps, tokens, masks)
                if (stepNumber == totalSteps) {
                    this.requestCallbackStorage.delete(uuid)
                }
            }
        } else {
            //console.log('no registered callback for', uuid)
        }
    }


    detokenize(tokens: number[][], desiredSampleRate: number, callback: (x: any) => void) {
        const requestUuid = uuid()
        this.requestCallbackStorage.set(requestUuid, callback)
        this.socket.emit('detokenize', {
            'modelType': this.modelType,
            'uuid': requestUuid,
            'tokens': tokens,
            'desiredSampleRate': desiredSampleRate,
            'audioIsLittleEndian': platformIsLittleEndian()
        })
    }

    _handleDetokenizeResponse(uuid: string, audioFloat32Bytes: ArrayBuffer) {
        console.log('in detokenizeResponse handler: audio', audioFloat32Bytes)
        const callback = this.requestCallbackStorage.get(uuid)

        const audio = new Float32Array(audioFloat32Bytes)
        //const audio =

        if (callback) {
            callback(audio)
            this.requestCallbackStorage.delete(uuid)
        } else {
            //console.log('no registered callback for', uuid)
        }

    }



}