CONFIDENCE_THRESHOLD = 0.7
MEMORY_FILE = "task_model_memory.json"

# Within each tier, try in this provider order
PROVIDER_ORDER = ["google", "openai", "anthropic"]

MODEL_TIERS: dict[str, list[dict]] = {
    "google": [
        {"tier": 3, "model": "gemini-2.0-flash-lite", "name": "Gemini 2.0 Flash Lite"},
        {"tier": 2, "model": "gemini-2.5-flash",      "name": "Gemini 2.5 Flash"},
        {"tier": 1, "model": "gemini-2.5-pro",        "name": "Gemini 2.5 Pro"},
    ],
    "openai": [
        {"tier": 3, "model": "gpt-4.1-nano",  "name": "GPT-4.1 Nano"},
        {"tier": 2, "model": "gpt-5-mini",    "name": "GPT-5 Mini"},
        {"tier": 1, "model": "gpt-5",         "name": "GPT-5"},
    ],
    "anthropic": [
        {"tier": 3, "model": "claude-haiku-3-5-20241022", "name": "Claude Haiku 3.5"},
        {"tier": 2, "model": "claude-sonnet-4-6",         "name": "Claude Sonnet 4"},
        {"tier": 1, "model": "claude-opus-4-7",           "name": "Claude Opus 4"},
    ],
}

# Flat trial sequence: all tier 3 (google→openai→anthropic), then tier 2, then tier 1
def _build_trial_order() -> list[dict]:
    order = []
    for tier in [3, 2, 1]:
        for provider in PROVIDER_ORDER:
            model = next(m for m in MODEL_TIERS[provider] if m["tier"] == tier)
            order.append({
                "tier": tier,
                "provider": provider,
                "model": model["model"],
                "name": model["name"],
            })
    return order

TRIAL_ORDER: list[dict] = _build_trial_order()

ROUTER_SYSTEM_PROMPT = """You are a specialized AI assistant. Complete the given task.

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "completed": true,
  "confidence": 0.85,
  "result": "your full response here",
  "reason": "brief note on completion or why you could not complete it"
}

Set "completed": false and confidence below 0.5 if:
- The task complexity or reasoning depth is beyond your current capability
- You lack sufficient knowledge to answer reliably
- The task requires multi-step reasoning you cannot perform accurately

Be honest about confidence. A lower-tier model setting completed=false triggers escalation to a more capable model."""
