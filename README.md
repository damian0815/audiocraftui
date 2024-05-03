# musicgen riff playground

a web ui for playing around with the MusicGen tokenization and prediction features. built by damian0815 using React + Flask + Vite + socketio

## Backend

You can either use Docker or run locally.

### Docker

```shell
$ docker build --tag audiocraftui:latest https://github.com/damian0815/audiocraftui.git
$ docker run --gpus all --rm -e DEVICE=cuda -p 4000:4000 -i -t audiocraftui:latest --host=0.0.0.0
```

### Local

create venv:
```shell
python -m venv --prompt audiocraftui --system-site-packages venv 
source venv/bin/activate
```

install dependencies:
```shell
pip install -r requirements.txt
```

run:
```shell
flask run --port 4000 --debug
```

## Frontend

Install js stuff (assumes you already have node installed, if not use nvm or similar to install node.js 18+):
```shell
cd vite
npm install
npm install -g vite
```

Launch:

```shell
cd vite
vite dev
```

then navigate to [http://localhost:5173](http://localhost:5173).

