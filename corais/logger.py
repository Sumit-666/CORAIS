import json
import uuid
from datetime import date, datetime
from pathlib import Path

LOGS_FILE = Path("routing_logs.json")
MAX_ENTRIES = 1_000


def _load() -> list:
    if not LOGS_FILE.exists():
        return []
    try:
        return json.loads(LOGS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save(logs: list) -> None:
    LOGS_FILE.write_text(json.dumps(logs, indent=2), encoding="utf-8")


def append_log(entry: dict) -> None:
    logs = _load()
    logs.append({
        "id":        str(uuid.uuid4())[:8],
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        **entry,
    })
    if len(logs) > MAX_ENTRIES:
        logs = logs[-MAX_ENTRIES:]
    _save(logs)


def get_logs(limit: int = 50) -> list:
    logs = _load()
    return list(reversed(logs[-limit:]))   # newest first


def get_today_stats() -> dict:
    today = str(date.today())
    logs = [l for l in _load() if l.get("timestamp", "").startswith(today)]

    if not logs:
        return {
            "total_calls": 0,
            "total_cost":  0.0,
            "cache_hits":  0,
            "cache_hit_rate": 0.0,
            "model_distribution": {},
        }

    total_cost  = sum(l.get("cost_usd", 0.0) for l in logs)
    cache_hits  = sum(1 for l in logs if l.get("cache_hit", False))

    model_dist: dict[str, dict] = {}
    for l in logs:
        mid  = l.get("model_id", "unknown")
        name = l.get("model_name", mid)
        if mid not in model_dist:
            model_dist[mid] = {"model_name": name, "count": 0, "total_cost": 0.0}
        model_dist[mid]["count"]      += 1
        model_dist[mid]["total_cost"] += l.get("cost_usd", 0.0)

    # Round costs
    for v in model_dist.values():
        v["total_cost"] = round(v["total_cost"], 6)

    return {
        "total_calls":  len(logs),
        "total_cost":   round(total_cost, 4),
        "cache_hits":   cache_hits,
        "cache_hit_rate": round(cache_hits / len(logs) * 100, 1),
        "model_distribution": model_dist,
    }
