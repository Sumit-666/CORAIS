from .config import TRIAL_ORDER

# ── Model Registry ────────────────────────────────────────────────────────────
# Keyed by the exact API model ID used in executor.py / config.py

MODEL_REGISTRY: dict[str, dict] = {
    # Tier 3 — cheapest / fastest
    "gemini-2.0-flash-lite": {
        "provider": "google",
        "display_name": "Gemini Flash Lite",
        "tier": 3,
        "cost_per_1m_input":  0.075,
        "cost_per_1m_output": 0.300,
        "is_active": True,
        "health_status": "healthy",
    },
    "gpt-4.1-nano": {
        "provider": "openai",
        "display_name": "GPT-4.1 Nano",
        "tier": 3,
        "cost_per_1m_input":  0.10,
        "cost_per_1m_output": 0.40,
        "is_active": True,
        "health_status": "healthy",
    },
    "claude-haiku-3-5-20241022": {
        "provider": "anthropic",
        "display_name": "Haiku 3.5",
        "tier": 3,
        "cost_per_1m_input":  0.80,
        "cost_per_1m_output": 4.00,
        "is_active": True,
        "health_status": "healthy",
    },
    # Tier 2 — balanced
    "gemini-2.5-flash": {
        "provider": "google",
        "display_name": "Gemini 2.5 Flash",
        "tier": 2,
        "cost_per_1m_input":  0.15,
        "cost_per_1m_output": 0.60,
        "is_active": True,
        "health_status": "healthy",
    },
    "gpt-5-mini": {
        "provider": "openai",
        "display_name": "GPT-5 Mini",
        "tier": 2,
        "cost_per_1m_input":  1.10,
        "cost_per_1m_output": 4.40,
        "is_active": True,
        "health_status": "healthy",
    },
    "claude-sonnet-4-6": {
        "provider": "anthropic",
        "display_name": "Sonnet 4",
        "tier": 2,
        "cost_per_1m_input":   3.00,
        "cost_per_1m_output": 15.00,
        "is_active": True,
        "health_status": "healthy",
    },
    # Tier 1 — best quality
    "gemini-2.5-pro": {
        "provider": "google",
        "display_name": "Gemini 2.5 Pro",
        "tier": 1,
        "cost_per_1m_input":   1.25,
        "cost_per_1m_output": 10.00,
        "is_active": True,
        "health_status": "healthy",
    },
    "gpt-5": {
        "provider": "openai",
        "display_name": "GPT-5",
        "tier": 1,
        "cost_per_1m_input":   5.00,
        "cost_per_1m_output": 20.00,
        "is_active": True,
        "health_status": "healthy",
    },
    "claude-opus-4-7": {
        "provider": "anthropic",
        "display_name": "Opus 4",
        "tier": 1,
        "cost_per_1m_input":  15.00,
        "cost_per_1m_output": 75.00,
        "is_active": True,
        "health_status": "healthy",
    },
}

# Maps model_id → index in TRIAL_ORDER (0-8) for frontend grid rendering.
# Built once at import time so the 3×3 ModelGrid never needs changing.
MODEL_INDEX: dict[str, int] = {t["model"]: i for i, t in enumerate(TRIAL_ORDER)}


# ── Task Routing Matrix ───────────────────────────────────────────────────────
# Each task defines its own priority-ordered model sequence and metadata flags.

TASK_ROUTING: dict[str, dict] = {
    # ── CORAIS demo tasks ────────────────────────────────────────────────────
    "jd_parsing": {
        "is_cri_affecting": False,
        "is_security_critical": False,
        "task_priority": "HIGH",       # paused at STOPPED only
        "model_order": [               # priority list: cheapest first
            "gpt-4.1-nano",
            "claude-haiku-3-5-20241022",
            "gemini-2.0-flash-lite",
            "gpt-5-mini",
            "claude-sonnet-4-6",
            "gemini-2.5-flash",
            "gpt-5",
            "claude-opus-4-7",
            "gemini-2.5-pro",
        ],
    },
    "candidate_evaluation": {
        "is_cri_affecting": True,
        "is_security_critical": False,
        "task_priority": "CRITICAL",   # never budget-degraded
        "model_order": [
            "gpt-4.1-nano",
            "claude-haiku-3-5-20241022",
            "gemini-2.0-flash-lite",
            "gpt-5-mini",
            "claude-sonnet-4-6",
            "gemini-2.5-flash",
            "gpt-5",
            "claude-opus-4-7",
            "gemini-2.5-pro",
        ],
    },
    "career_advice": {
        "is_cri_affecting": False,
        "is_security_critical": False,
        "task_priority": "NORMAL",     # paused at CRITICAL budget tier
        "model_order": [
            "gpt-4.1-nano",
            "claude-haiku-3-5-20241022",
            "gemini-2.0-flash-lite",
            "gpt-5-mini",
            "claude-sonnet-4-6",
            "gemini-2.5-flash",
            "gpt-5",
            "claude-opus-4-7",
            "gemini-2.5-pro",
        ],
    },
    # ── Jobazy production tasks ──────────────────────────────────────────────
    "resume_parse": {
        "is_cri_affecting": True,
        "is_security_critical": False,
        "task_priority": "CRITICAL",
        "model_order": [
            "gpt-4.1-nano",
            "claude-haiku-3-5-20241022",
            "gemini-2.0-flash-lite",
            "gpt-5",
        ],
    },
    "code_eval_easy": {
        "is_cri_affecting": True,
        "is_security_critical": False,
        "task_priority": "CRITICAL",
        "model_order": ["gpt-4.1-nano", "claude-haiku-3-5-20241022"],
    },
    "code_eval_hard": {
        "is_cri_affecting": True,
        "is_security_critical": False,
        "task_priority": "CRITICAL",
        "model_order": ["gpt-5", "claude-sonnet-4-6", "claude-haiku-3-5-20241022"],
    },
    "interview_eval": {
        "is_cri_affecting": True,
        "is_security_critical": False,
        "task_priority": "CRITICAL",
        "model_order": ["gpt-4.1-nano", "claude-haiku-3-5-20241022", "gpt-5"],
    },
    "content_gen": {
        "is_cri_affecting": False,
        "is_security_critical": False,
        "task_priority": "NORMAL",
        "model_order": [
            "gpt-4.1-nano",
            "claude-haiku-3-5-20241022",
            "gemini-2.0-flash-lite",
        ],
    },
    "cover_letter": {
        "is_cri_affecting": False,
        "is_security_critical": False,
        "task_priority": "NORMAL",
        "model_order": ["gpt-4.1-nano", "claude-haiku-3-5-20241022"],
    },
    "fraud_triage_low": {
        "is_cri_affecting": False,
        "is_security_critical": True,
        "task_priority": "CRITICAL",
        "model_order": ["gpt-4.1-nano", "claude-haiku-3-5-20241022"],
    },
    "fraud_triage_high": {
        "is_cri_affecting": False,
        "is_security_critical": True,
        "task_priority": "CRITICAL",
        "model_order": ["gpt-5", "claude-sonnet-4-6"],
    },
    "semantic_code_hash": {
        "is_cri_affecting": False,
        "is_security_critical": True,
        "task_priority": "CRITICAL",
        "model_order": ["gpt-4.1-nano", "claude-haiku-3-5-20241022"],
    },
    "hindi_sentiment": {
        "is_cri_affecting": False,
        "is_security_critical": False,
        "task_priority": "LOW",
        "model_order": ["gpt-4.1-nano"],
    },
}


# ── Public helpers ────────────────────────────────────────────────────────────

def get_task_trial_sequence(task_type: str) -> list[dict]:
    """
    Returns an ordered list of trial dicts for the task.
    Each dict is compatible with memory.py format:
      { trial_index, model, name, tier, provider }
    Only healthy + active models are included.
    Falls back to full TRIAL_ORDER if task not in matrix.
    """
    task = TASK_ROUTING.get(task_type)
    model_ids = task["model_order"] if task else [t["model"] for t in TRIAL_ORDER]

    result = []
    for model_id in model_ids:
        reg = MODEL_REGISTRY.get(model_id)
        if reg is None:
            continue
        if not reg["is_active"] or reg["health_status"] != "healthy":
            continue
        trial_index = MODEL_INDEX.get(model_id)
        if trial_index is None:
            continue
        result.append({
            "trial_index": trial_index,
            "model":       model_id,
            "name":        reg["display_name"],
            "tier":        reg["tier"],
            "provider":    reg["provider"],
        })
    return result


def get_task_priority(task_type: str) -> str:
    task = TASK_ROUTING.get(task_type)
    return task["task_priority"] if task else "NORMAL"


def calculate_cost(model_id: str, input_tokens: int, output_tokens: int) -> float:
    reg = MODEL_REGISTRY.get(model_id)
    if not reg:
        return 0.0
    return round(
        input_tokens  * reg["cost_per_1m_input"]  / 1_000_000 +
        output_tokens * reg["cost_per_1m_output"] / 1_000_000,
        6,
    )


def toggle_model(model_id: str) -> bool:
    """Toggles is_active. Returns new state."""
    reg = MODEL_REGISTRY.get(model_id)
    if not reg:
        return False
    reg["is_active"] = not reg["is_active"]
    return reg["is_active"]
