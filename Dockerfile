FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
LABEL authors="damian"

COPY ./requirements.txt /install/requirements.txt
RUN pip install -r /install/requirements.txt

WORKDIR /workspace/audiocraftui
COPY app.py .
COPY audiocraft_wrapper.py .

ENTRYPOINT ["flask", "run", "--port", "4000", "--debug"]
