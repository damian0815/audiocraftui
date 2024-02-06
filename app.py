from flask import Flask,render_template,request
from flask_socketio import SocketIO, emit
from flask_cors import CORS, cross_origin

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

print("extensions: ", app.extensions)

if __name__ == '__main__':
    socketio.run(app, port=4000)
