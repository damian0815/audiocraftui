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

def unpack_32bit_float_array(byte_buffer, is_little_endian):
    count = int(len(byte_buffer) / 4)
    format_string = f"{'<' if is_little_endian else '>'}{count}f"
    return struct.unpack(format_string,
                         byte_buffer)


@socketio.on("tokenize")
def tokenize_event(data):
    global audiocraft_wrapper
    print(f"request to tokenize, data is {type(data)} and has len {len(data)}, keys {data.keys()}")

    audio_data_float32bytes = data['audioFloat32Bytes']
    audio_data_is_little_endian = data['audioIsLittleEndian']
    audio_data = unpack_32bit_float_array(audio_data_float32bytes, audio_data_is_little_endian)
    sample_rate = data['sample_rate']

    print(f"got audio_data of type {type(audio_data)}, {len(audio_data)} samples at {sample_rate}Hz -> {len(audio_data)/sample_rate} seconds")

    audio_tensor = torch.tensor(audio_data).unsqueeze(0)
    print(f"resulting audio tensor {audio_tensor}, shape {audio_tensor.shape}")

    if audiocraft_wrapper is None:
        print("building audiocraft wrapper...")
        audiocraft_wrapper = AudiocraftWrapper()

    resampled_audio = audiocraft_wrapper.prepare_audio_for_tokenization(audio_tensor, sample_rate=sample_rate)
    tokens = audiocraft_wrapper.generate_tokens_from_audio(resampled_audio)
    print("tokenized to ", tokens)

    sid = request.sid
    emit('tokenizeResponse', {'uuid': data['uuid'], 'tokens': tokens[0].tolist()}, room=sid)


print("extensions: ", app.extensions)

if __name__ == '__main__':
    socketio.run(app, port=4000)
