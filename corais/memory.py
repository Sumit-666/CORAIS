import json
import os
from datetime import datetime

from .config import MEMORY_FILE


def _load() -> dict:
    if not os.path.exists(MEMORY_FILE):
        return {}
    with open(MEMORY_FILE, "r") as f:
        return json.load(f)


def _save(memory: dict) -> None:
    with open(MEMORY_FILE, "w") as f:
        json.dump(memory, f, indent=2)


def get_cached_trial(task_type: str) -> dict | None:
    return _load().get(task_type)


def cache_trial(task_type: str, trial_index: int, trial: dict) -> None:
    memory = _load()
    prev = memory.get(task_type, {})
    memory[task_type] = {
        "trial_index": trial_index,
        "model_id":    trial["model"],
        "model_name":  trial["name"],
        "tier":        trial["tier"],
        "provider":    trial["provider"],
        "task_type":   task_type,
        "last_updated": datetime.now().isoformat(),
        "success_count": prev.get("success_count", 0) + 1,
    }
    _save(memory)


def list_memory() -> dict:
    return _load()
