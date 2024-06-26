FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
LABEL authors="damian"

RUN apt update && apt install -y git && apt-get clean

COPY ./requirements.txt /install/requirements.txt
RUN pip install -r /install/requirements.txt

COPY backend /workspace/audiocraftui/backend

WORKDIR /workspace/audiocraftui/backend
EXPOSE 4000
ENTRYPOINT ["flask", "run", "--port", "4000", "--host", "0.0.0.0"]
