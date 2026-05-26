import hashlib
import time

# TTL in seconds per task type. 0 = bypass (never cache).
_TTL: dict[str, int] = {
    "jd_parsing":           86_400,   # 24 h — same JD yields same skills
    "resume_parse":         86_400,
    "candidate_evaluation":  3_600,   # 1 h
    "career_advice":         3_600,
    "content_gen":           3_600,
    "cover_letter":          3_600,
    "interview_eval":            0,   # always fresh
    "fraud_triage_low":          0,
    "fraud_triage_high":         0,
}
_DEFAULT_TTL = 3_600

_store: dict[str, dict] = {}
_stats = {"hits": 0, "misses": 0}


def _key(prompt_type: str, prompt_text: str) -> str:
    raw = f"{prompt_type}::{prompt_text}"
    return hashlib.sha256(raw.encode()).hexdigest()


def get(prompt_type: str, prompt_text: str):
    """Returns cached (result, trial) tuple or None on miss/bypass."""
    ttl = _TTL.get(prompt_type, _DEFAULT_TTL)
    if ttl == 0:
        _stats["misses"] += 1
        return None

    k = _key(prompt_type, prompt_text)
    entry = _store.get(k)

    if entry is None or time.monotonic() > entry["expires_at"]:
        if k in _store:
            del _store[k]
        _stats["misses"] += 1
        return None

    _stats["hits"] += 1
    return entry["value"]


def set(prompt_type: str, prompt_text: str, value) -> None:
    """Cache value for this prompt. value should be (result, trial)."""
    ttl = _TTL.get(prompt_type, _DEFAULT_TTL)
    if ttl == 0:
        return
    k = _key(prompt_type, prompt_text)
    _store[k] = {
        "value":      value,
        "expires_at": time.monotonic() + ttl,
    }


def get_stats() -> dict:
    now = time.monotonic()
    active = sum(1 for v in _store.values() if v["expires_at"] > now)
    total  = _stats["hits"] + _stats["misses"]
    return {
        "active_entries": active,
        "hits":    _stats["hits"],
        "misses":  _stats["misses"],
        "hit_rate": round(_stats["hits"] / total * 100, 1) if total else 0.0,
    }
