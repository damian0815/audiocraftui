import threading
import wave
import random
from typing import Callable

from audiocraft.data.audio_utils import convert_audio
from audiocraft.models import MusicGen
from audiocraft.models import MAGNeT
import torch
from audiocraft.models.genmodel import BaseGenModel

def save_wave_file(audio: torch.Tensor, samplerate: int, wave_file_name: str):
    audio = (audio.detach().cpu().numpy() * (2 ** 15 - 1)).astype("<h")
    with wave.open(wave_file_name, "wb") as f:
        f.setnchannels(1)
        # 2 bytes per sample.
        f.setsampwidth(2)
        f.setframerate(samplerate)
        f.writeframes(audio.tobytes())


class AudiocraftWrapper():

    audiocraft_sample_rate = 32000

    @classmethod
    def from_musicgen_pretrained(cls, model_id: str='facebook/musicgen-small', device: str="cpu"):
        model = MusicGen.get_pretrained(model_id, device=device)
        return AudiocraftWrapper(model=model)

    @classmethod
    def from_magnet_pretrained(cls, model_id: str='facebook/magnet-small-10secs', device: str="cpu"):
        model = MAGNeT.get_pretrained(model_id, device=device)
        return AudiocraftWrapper(model=model)

    def __init__(self, model: BaseGenModel):
        # Using small model, better results would be obtained with `medium` or `large`.
        self.model = model
        self.lock = threading.Lock()
        self.cancelled_uuids = list()

    def resample_audio(self, audio_data: torch.FloatTensor, current_sample_rate: int, new_sample_rate: int) -> torch.Tensor:
        resampled_audio = convert_audio(audio_data, current_sample_rate, new_sample_rate, to_channels=1)
        return resampled_audio


    def prepare_audio_for_tokenization(self, audio_data: torch.FloatTensor, sample_rate: int) -> torch.Tensor:
        """
        :param audio_data: Audio input (floating point PCM), shape = [C, N] where C = num channels and N = num samples
        :param sample_rate:
        :return: converted audio data of shape [1,C_,N_] where C_ is the audiocraft channel expectation and N has been resampled
        """
        TARGET_CHANNEL_COUNT = 1
        if len(audio_data.shape) != 2 or audio_data.shape[0] > audio_data.shape[1]:
            raise ValueError(f"bad audio_data shape, expected [C,N] (c=channels, n=samples), got {audio_data.shape}")
        converted_audio = convert_audio(audio_data, sample_rate, self.audiocraft_sample_rate, TARGET_CHANNEL_COUNT)
        return converted_audio.unsqueeze(0)


    def generate_audio_from_tokens(self, tokens: torch.Tensor) -> torch.Tensor:
        with torch.no_grad():
            if len(tokens.shape) != 3 or tokens.shape[0] != 1 or tokens.shape[1] != 4:
                raise ValueError(f"bad tokens shape, expected (1,4,N), got {tokens.shape}")
            res = self.model.compression_model.decode(tokens, force_cpu_elu=True)
            return res

    def generate_tokens_from_audio(self, audio: torch.Tensor) -> torch.Tensor:
        with torch.no_grad():
            if len(audio.shape) != 3 or audio.shape[0] != 1:
                raise ValueError(f"bad audio shape, expected (1,C,N), got {audio.shape}")
            res = self.model.compression_model.encode(audio)[0]
            return res


    def generate_magnet_tokens(self,
                               prompt: str,
                               request_uuid: str,
                               seed: int,
                               steps: list[int],
                               progress_callback: Callable[[int, int, torch.Tensor], None],
                               max_cfg_coef: float=10.0,
                               min_cfg_coef: float=1.0,
                               initial_tokens: torch.Tensor = None,
                               initial_timesteps: list[float] = None,
                            ) -> torch.Tensor:
        print("in generate - updated wrapper")
        with torch.no_grad():
            initialization_kwargs = {}
            if initial_tokens is not None:
                initialization_kwargs['initial_tokens'] = initial_tokens
            if initial_timesteps is not None:
                initialization_kwargs['initial_timesteps'] = initial_timesteps
            self.model.set_generation_params(
                use_sampling=True,
                top_k=0,
                top_p=0.9,
                temperature=3.0,
                max_cfg_coef=max_cfg_coef,
                min_cfg_coef=min_cfg_coef,
                #decoding_steps=[int(20 * self.model.lm.cfg.dataset.segment_duration // 10), 10, 10, 10],
                decoding_steps=steps,
                span_arrangement='stride1',
                **initialization_kwargs
            )

            def cancellation_callback():
                should_cancel = request_uuid in self.cancelled_uuids
                print(f"should cancel: {should_cancel}, because: request_uuid {request_uuid}, cancelled_uuids {self.cancelled_uuids}")
                return should_cancel

            with self.lock:
                self.model.set_custom_progress_callback(progress_callback)
                self.model.set_should_cancel_callback(cancellation_callback)
                if seed is not None:
                    random.seed(seed)
                    torch.manual_seed(seed)
                output = self.model.generate(descriptions=[prompt],
                                             progress=True,
                                             return_tokens=True)
                #audio_output = model.compression_model.decode(output[1], force_cpu_elu=True)
                #display_audio(audio_output, sample_rate=model.compression_model.sample_rate)
                self.model.set_custom_progress_callback(None)
                self.model.set_should_cancel_callback(None)
                if output is None:
                    progress_callback(0, 0, None)
                else:
                    return output[1]

    def request_cancel_generation(self, uuid: str):
        self.cancelled_uuids.append(uuid)
