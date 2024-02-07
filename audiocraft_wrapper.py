from audiocraft.models import MusicGen
import torch

class AudiocraftWrapper():

    def __init__(self, model: str='facebook/musicgen-small', device: str="cpu"):
        # Using small model, better results would be obtained with `medium` or `large`.
        self.model = MusicGen.get_pretrained(model, device=device)


    def generate_audio_from_tokens(self, tokens: torch.tensor):
        if len(tokens.shape) != 3 or tokens.shape[0] != 1 or tokens.shape[1] != 4:
            raise ValueError(f"bad tokens shape, expected (1,4,N), got {tokens.shape}")
        res = self.model.compression_model.decode(tokens)
        return res

    def generate_tokens_from_audio(self, audio: torch.tensor):
        if len(audio.shape) != 3 or audio.shape[0] != 1:
            raise ValueError(f"bad audio shape, expected (1,C,N), got {audio.shape}")
        res = self.model.compression_model.encode(audio)[0]
        return res

