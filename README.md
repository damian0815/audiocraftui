# React + Flask + Vite + socketio

## setup

create venv
```shell
python -m venv --prompt audiocraftui --system-site-packages venv 
source venv/bin/activate
```

clone audiocraft and install requirements (my commit: 2a5c5e971915aa03bd99defe44bde2a4bebb4361)
```shell
git clone git@github.com:facebookresearch/audiocraft.git
pip install -r audiocraft/requirements.txt
pip install flask flask_socketio flask_cors
```

## todo: put this stuff in a docker container
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
