import struct

import msgpack
import torch
from flask import Flask,render_template,request
from flask_socketio import SocketIO, emit
from flask_cors import CORS, cross_origin
from audiocraft_wrapper import AudiocraftWrapper

app = Flask(__name__)
socketio = SocketIO(app,debug=True,cors_allowed_origins='*')
CORS(app)

@socketio.on("connect")
def on_connect():
    print("connected")

@socketio.on("disconnect")
def on_disconnect():
    print("disconnected")


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

audiocraft_wrapper = None
def get_audiocraft_wrapper():
    global audiocraft_wrapper
    if audiocraft_wrapper is None:
        print("building audiocraft wrapper...")
        audiocraft_wrapper = AudiocraftWrapper()
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

    resampled_audio = get_audiocraft_wrapper().prepare_audio_for_tokenization(audio_tensor, sample_rate=sample_rate)
    tokens = get_audiocraft_wrapper().generate_tokens_from_audio(resampled_audio)
    print("tokenized to ", tokens)

    sid = request.sid
    emit('tokenizeResponse', {'uuid': data['uuid'], 'tokens': tokens[0].tolist()}, room=sid)


@socketio.on('detokenize')
def detokenize_event(data):
    print(f"request to tokenize, data is {type(data)} and has len {len(data)}, keys {data.keys()}")
    tokens = data['tokens']
    tokens_tensor = torch.tensor(tokens, dtype=torch.int).unsqueeze(0)
    audio = get_audiocraft_wrapper().generate_audio_from_tokens(tokens_tensor)
    sample_rate = data['desiredSampleRate']
    audio = get_audiocraft_wrapper().resample_audio(audio,
                                                    current_sample_rate=get_audiocraft_wrapper().audiocraft_sample_rate,
                                                    new_sample_rate=sample_rate)
    print("detokenized to", audio)

    packed_floats = pack_32bit_float_array(audio[0][0].tolist(), to_little_endian=False)
    #print("packed to", packed_floats)
    sid = request.sid
    emit('detokenizeResponse', {
        'uuid': data['uuid'],
        'audioFloat32Bytes': packed_floats,
        'audioIsLittleEndian': False
    }, room=sid)

print("extensions: ", app.extensions)

if __name__ == '__main__':
    socketio.run(app, port=4000)
