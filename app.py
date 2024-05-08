import os
import struct
from typing import Optional

import torch
from flask import Flask, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from backend.audiocraft_wrapper import AudiocraftWrapper
from backend.generation_history import GenerationParameters

app = Flask(__name__)
socketio = SocketIO(app,debug=True,cors_allowed_origins='*')
CORS(app)

default_device = os.environ.get('DEVICE', 'cpu')
default_model_magnet = os.environ.get('MODEL_MAGNET', 'facebook/magnet-small-10secs')

@socketio.on("connect")
def on_connect():
    print("connected")

@socketio.on("disconnect")
def on_disconnect():
    print("disconnected")

@socketio.on("generate")
def on_generate(data):
    print("generating with data", data)
    uuid = data['uuid']
    generation_parameters = GenerationParameters.from_dict(data['parameters'])
    model_type = data['modelType']
    prompt = data['prompt']
    seed = data['seed']
    steps = data['steps']
    max_cfg_coef = data.get('max_cfg_coef', 10.0)
    min_cfg_coef = data.get('min_cfg_coef', 1.0)
    initial_msk_pcts = data.get('initial_mask_pcts', None)
    final_msk_pcts = data.get('final_mask_pcts', None)
    initial_tokens = data.get('initial_tokens', None)
    use_sampling = data.get('use_sampling', True)
    top_k = data.get('top_k', 0)
    top_p = data.get('top_p', 0.9)
    temperature = data.get('temperature', 3.0)
    negative_prompt = data.get('negative_prompt', None)
    def progress_callback(i: int, count: int, tokens: torch.Tensor):
        progress_args = { "uuid": uuid,
                          "i": i,
                          "count": count,
                          "tokens": None if tokens is None else tokens[0].tolist(),
                          "masks": None,# if masks is None else masks[0].tolist()
                        }
        #print("generate progress:", progress_args)
        emit("generateProgress", progress_args)
    get_audiocraft_wrapper(model_type).generate_magnet_tokens(
        prompt,
        negative_prompt=negative_prompt,
        request_uuid=uuid,
        seed=seed,
        steps=steps,
        progress_callback=progress_callback,
        use_sampling=use_sampling,
        top_k=top_k,
        top_p=top_p,
        temperature=temperature,
        max_cfg_coef=max_cfg_coef,
        min_cfg_coef=min_cfg_coef,
        initial_mask_pcts=initial_msk_pcts,
        final_mask_pcts=final_msk_pcts,
        initial_tokens=initial_tokens
    )

@socketio.on("cancelGeneration")
def on_cancel_generation(data):
    print("requesting cancel with data", data)
    get_audiocraft_wrapper().request_cancel_generation(data['uuid'])

@socketio.on("foo")
def foo_event():
    print("got foo")
    for x in range(3):
        sid = request.sid
        emit('fooResponse', {"data1":x, "data":f"hello number {x}"}, room=sid)
        socketio.sleep(1)

@socketio.on("set_tokens")
def set_tokens_event(data):
    print("got set_tokens:", data)

audiocraft_wrapper: Optional[AudiocraftWrapper] = None
def get_audiocraft_wrapper(type: str = 'musicgen', device: str = default_device) -> AudiocraftWrapper:
    if type not in ['magnet', 'musicgen']:
        raise ValueError("type must be 'magnet' or 'musicgen'")
    global audiocraft_wrapper
    if audiocraft_wrapper is None:
        print(f"building {type} audiocraft wrapper on {device}...")
        if type == 'musicgen':
            audiocraft_wrapper = AudiocraftWrapper.from_musicgen_pretrained(device=device)
        elif type == 'magnet':
            audiocraft_wrapper = AudiocraftWrapper.from_magnet_pretrained(device=device, model_id=default_model_magnet)
    return audiocraft_wrapper


def unpack_32bit_float_array(byte_buffer, is_little_endian):
    count = int(len(byte_buffer) / 4)
    format_string = f"{'<' if is_little_endian else '>'}{count}f"
    return struct.unpack(format_string,
                         byte_buffer)

def pack_32bit_float_array(floats, to_little_endian):
    count = len(floats)
    format_string = f"{'<' if to_little_endian else '>'}{count}f"
    print("packing with format string: ", format_string)
    return struct.pack(format_string, *floats)


@socketio.on("tokenize")
def tokenize_event(data):
    print(f"request to tokenize, data is {type(data)} and has len {len(data)}, keys {data.keys()}")

    audio_data_float32bytes = data['audioFloat32Bytes']
    audio_data_is_little_endian = data['audioIsLittleEndian']
    audio_data = unpack_32bit_float_array(audio_data_float32bytes, audio_data_is_little_endian)
    sample_rate = data['sample_rate']

    print(f"got audio_data of type {type(audio_data)}, {len(audio_data)} samples at {sample_rate}Hz -> {len(audio_data)/sample_rate} seconds")

    audio_tensor = torch.tensor(audio_data).unsqueeze(0)
    print(f"resulting audio tensor {audio_tensor}, shape {audio_tensor.shape}")

    resampled_audio = get_audiocraft_wrapper(data['modelType']).prepare_audio_for_tokenization(audio_tensor, sample_rate=sample_rate)
    tokens = get_audiocraft_wrapper(data['modelType']).generate_tokens_from_audio(resampled_audio)
    print("tokenized to ", tokens)

    sid = request.sid
    emit('tokenizeResponse', {'uuid': data['uuid'], 'tokens': tokens[0].tolist()}, room=sid)


@socketio.on('detokenize')
def detokenize_event(data):
    print(f"request to detokenize, data is {type(data)} and has len {len(data)}, keys {data.keys()}")
    tokens = data['tokens']
    audiocraft_wrapper = get_audiocraft_wrapper(data['modelType'])
    tokens_tensor = torch.tensor(tokens, dtype=torch.int, device=audiocraft_wrapper.model.device).unsqueeze(0)
    print(" -> tokens tensor shape", tokens_tensor.shape)
    print(" -> tokens tensor head", tokens_tensor[0, 0, :20])
    audio = audiocraft_wrapper.generate_audio_from_tokens(tokens_tensor)
    sample_rate = data['desiredSampleRate']
    audio = get_audiocraft_wrapper(data['modelType']).resample_audio(audio,
                                                    current_sample_rate=audiocraft_wrapper.audiocraft_sample_rate,
                                                    new_sample_rate=sample_rate)
    print("detokenized and converted to",
          ("little-endian" if data['audioIsLittleEndian'] else "big-endian"),
          "audio tensor with shape", audio.shape,
          ":", audio)

    #save_wave_file(audio, sample_rate, "/tmp/detokenized_audio.wav")
    packed_floats = pack_32bit_float_array(audio[0][0].tolist(), to_little_endian=data['audioIsLittleEndian'])
    #print("packed to", packed_floats)
    sid = request.sid
    emit('detokenizeResponse', {
        'uuid': data['uuid'],
        'audioFloat32Bytes': packed_floats
    }, room=sid)

print("extensions: ", app.extensions)

if __name__ == '__main__':
    socketio.run(app, port=4000)
