# musicgen riff playground

a web ui for playing around with the MusicGen tokenization and prediction features. built by damian0815 using React + Flask + Vite + socketio

## setup

### todo: put this stuff in a docker container

create venv
```shell
python -m venv --prompt audiocraftui --system-site-packages venv 
source venv/bin/activate
```

clone audiocraft and install requirements
```shell
git clone git@github.com:facebookresearch/audiocraft.git
```
for mps support:
```shell
git clone git@github.com:damian0815/audiocraft.git
git checkout mps_hacks
```

install dependencies:
```shell
pip install -r audiocraft/requirements.txt
pip install flask flask_socketio flask_cors
```

install js stuff (assumes you already have node installed, if not use nvm or similar to install node.js 18)
```shell
cd vite
npm install
npm install -g vite
```

to launch in debug (autoreload) mode, open two console sessions:

```shell
flask run --port 4000 --debug
```

and

```shell
cd vite
vite dev
```

then navigate to [http://localhost:5173](http://localhost:5173).
