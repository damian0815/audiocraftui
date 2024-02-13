from audiocraft.data.audio_utils import convert_audio
from audiocraft.models import MusicGen
import torch

class AudiocraftWrapper():

    audiocraft_sample_rate = 32000

    def __init__(self, model: str='facebook/musicgen-small', device: str="cpu"):
        # Using small model, better results would be obtained with `medium` or `large`.
        self.model = MusicGen.get_pretrained(model, device=device)

    def resample_audio(self, audio_data: torch.FloatTensor, current_sample_rate: int, new_sample_rate: int) -> torch.FloatTensor:
        resampled_audio = convert_audio(audio_data, current_sample_rate, new_sample_rate)
        return resampled_audio


    def prepare_audio_for_tokenization(self, audio_data: torch.FloatTensor, sample_rate: int) -> torch.FloatTensor:
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


    def generate_audio_from_tokens(self, tokens: torch.tensor):
        with torch.no_grad():
            if len(tokens.shape) != 3 or tokens.shape[0] != 1 or tokens.shape[1] != 4:
                raise ValueError(f"bad tokens shape, expected (1,4,N), got {tokens.shape}")
            res = self.model.compression_model.decode(tokens)
            return res

    def generate_tokens_from_audio(self, audio: torch.tensor) -> torch.IntTensor:
        with torch.no_grad():
            if len(audio.shape) != 3 or audio.shape[0] != 1:
                raise ValueError(f"bad audio shape, expected (1,C,N), got {audio.shape}")
            res = self.model.compression_model.encode(audio)[0]
            return res

