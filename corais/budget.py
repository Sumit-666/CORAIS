import json
from datetime import date
from pathlib import Path

BUDGET_FILE = Path("daily_spend.json")
DAILY_CEILING = 50.0  # USD

# Budget tiers and the minimum spend (USD) to enter each
TIER_THRESHOLDS = [
    ("STOPPED",  47.50),
    ("CRITICAL", 40.00),
    ("CONSERVE", 30.00),
    ("NORMAL",    0.00),
]

# Each task_priority stops being processed at/above this tier
_PAUSE_AT: dict[str, str] = {
    "CRITICAL": "NEVER",    # always runs
    "HIGH":     "STOPPED",  # paused only when STOPPED
    "NORMAL":   "CRITICAL", # paused at CRITICAL or worse
    "LOW":      "CONSERVE", # paused at CONSERVE or worse
}

_TIER_ORDER = ["NORMAL", "CONSERVE", "CRITICAL", "STOPPED"]


def _today() -> str:
    return str(date.today())


def _load_spend() -> float:
    if not BUDGET_FILE.exists():
        return 0.0
    try:
        data = json.loads(BUDGET_FILE.read_text(encoding="utf-8"))
        return float(data.get(_today(), 0.0))
    except Exception:
        return 0.0


def _save_spend(amount: float) -> None:
    data: dict = {}
    if BUDGET_FILE.exists():
        try:
            data = json.loads(BUDGET_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    data[_today()] = round(amount, 6)
    # Retain only the last 30 days to keep the file small
    keys = sorted(data.keys())
    if len(keys) > 30:
        for old in keys[:-30]:
            del data[old]
    BUDGET_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def get_today_spend() -> float:
    return _load_spend()


def get_tier() -> str:
    spend = _load_spend()
    for tier, threshold in TIER_THRESHOLDS:
        if spend >= threshold:
            return tier
    return "NORMAL"


def can_process(task_priority: str) -> bool:
    pause_at = _PAUSE_AT.get(task_priority, "CRITICAL")
    if pause_at == "NEVER":
        return True
    current = get_tier()
    current_idx = _TIER_ORDER.index(current)
    pause_idx   = _TIER_ORDER.index(pause_at)
    return current_idx < pause_idx


def record_spend(cost_usd: float) -> None:
    current = _load_spend()
    _save_spend(current + cost_usd)


def get_budget_status() -> dict:
    spend = get_today_spend()
    tier  = get_tier()
    return {
        "today_spend": round(spend, 4),
        "ceiling":     DAILY_CEILING,
        "tier":        tier,
        "pct":         round(spend / DAILY_CEILING * 100, 1),
    }
