from typing import Optional

import torch
from dataclasses import dataclass, field
from dataclass_wizard import JSONWizard


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
    wandering_mask: bool = False
    max_cfg_coef: float = 10.0
    min_cfg_coef: float = 1.0
    initial_tokens: Optional[list[list[float]]] = None
    initial_mask_pcts: Optional[list[float]] = None
    final_mask_pcts: Optional[list[float]] = None





class GenerationHistory:
    history: list[GenerationParameters] = field(default_factory=list)

    def __init__(self):
        pass

    def serialize(self):
        pass
