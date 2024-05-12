import os
from typing import Optional

import torch
from dataclasses import dataclass, field
from dataclass_wizard import JSONWizard

from .misc import get_user_data_dir


@dataclass
class GenerationParameters(JSONWizard):
    prompt: str
    negative_prompt: str = None
    seed: int = -1 # randomize seed
    steps: list[int] = field(default_factory=lambda: [20, 10, 10, 10])
    use_sampling: bool = True
    top_k: int = 0
    top_p: float = 0.9
    temperature: float = 3.0
    masking_strategy: str = "default"
    masking_options: dict = field(default_factory=dict)
    max_cfg_coef: float = 10.0
    min_cfg_coef: float = 1.0
    initial_tokens: Optional[list[list[float]]] = None
    initial_mask_pcts: Optional[list[float]] = None
    final_mask_pcts: Optional[list[float]] = None


def make_audio_path(uuid) -> str:
    audio_path = os.path.join(get_user_data_dir(), 'generations', f'{uuid}.mp3')
    return audio_path


class GenerationHistory:
    history: list[GenerationParameters] = field(default_factory=list)

    def __init__(self):
        pass

    def serialize(self):
        pass
