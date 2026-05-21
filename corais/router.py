from typing import TypedDict, Optional

from langgraph.graph import StateGraph, START, END

from .config import TRIAL_ORDER, CONFIDENCE_THRESHOLD
from .executor import execute_model
from .memory import get_cached_trial, cache_trial


class RouterState(TypedDict):
    task_type:   str
    task_input:  str
    trial_index: int
    result:      Optional[str]
    success:     bool
    confidence:  float
    attempts:    list[dict]


# ── nodes ─────────────────────────────────────────────────────────────────────

def check_memory_node(state: RouterState) -> RouterState:
    cached = get_cached_trial(state["task_type"])
    if cached:
        idx = cached["trial_index"]
        print(f"[CORAIS] Memory hit: '{state['task_type']}' → {cached['model_name']} (Tier {cached['tier']}, {cached['provider']})")
        return {**state, "trial_index": idx}
    print(f"[CORAIS] No memory for '{state['task_type']}' — starting at {TRIAL_ORDER[0]['name']} (Tier {TRIAL_ORDER[0]['tier']})")
    return {**state, "trial_index": 0}


def execute_node(state: RouterState) -> RouterState:
    trial = TRIAL_ORDER[state["trial_index"]]
    print(f"[CORAIS] Trying {trial['name']} (Tier {trial['tier']}, {trial['provider']})...")
    try:
        response = execute_model(trial["provider"], trial["model"], state["task_input"])
        completed  = bool(response.get("completed", False))
        confidence = float(response.get("confidence", 0.0))
        success    = completed and confidence >= CONFIDENCE_THRESHOLD
        attempt = {
            "tier":       trial["tier"],
            "provider":   trial["provider"],
            "model":      trial["model"],
            "model_name": trial["name"],
            "completed":  completed,
            "confidence": confidence,
        }
        return {
            **state,
            "result":     response.get("result"),
            "success":    success,
            "confidence": confidence,
            "attempts":   state.get("attempts", []) + [attempt],
        }
    except Exception as e:
        print(f"[CORAIS] Error: {e}")
        attempt = {
            "tier":       trial["tier"],
            "provider":   trial["provider"],
            "model":      trial["model"],
            "model_name": trial["name"],
            "completed":  False,
            "confidence": 0.0,
            "error":      str(e),
        }
        return {
            **state,
            "result":     None,
            "success":    False,
            "confidence": 0.0,
            "attempts":   state.get("attempts", []) + [attempt],
        }


def escalate_node(state: RouterState) -> RouterState:
    next_index = state["trial_index"] + 1
    next_trial = TRIAL_ORDER[next_index]
    print(f"[CORAIS] Escalating → {next_trial['name']} (Tier {next_trial['tier']}, {next_trial['provider']})")
    return {**state, "trial_index": next_index}


def save_memory_node(state: RouterState) -> RouterState:
    trial = TRIAL_ORDER[state["trial_index"]]
    cache_trial(state["task_type"], state["trial_index"], trial)
    print(f"[CORAIS] Saved: '{state['task_type']}' → {trial['name']} (Tier {trial['tier']}, {trial['provider']})")
    return state


# ── routing condition ─────────────────────────────────────────────────────────

def _should_escalate(state: RouterState) -> str:
    if state["success"]:
        return "save_memory"
    if state["trial_index"] >= len(TRIAL_ORDER) - 1:
        return "save_memory"  # exhausted all models, save last result
    return "escalate"


# ── graph ─────────────────────────────────────────────────────────────────────

def _build() -> StateGraph:
    g = StateGraph(RouterState)
    g.add_node("check_memory", check_memory_node)
    g.add_node("execute",      execute_node)
    g.add_node("escalate",     escalate_node)
    g.add_node("save_memory",  save_memory_node)

    g.add_edge(START,          "check_memory")
    g.add_edge("check_memory", "execute")
    g.add_conditional_edges("execute", _should_escalate, {
        "save_memory": "save_memory",
        "escalate":    "escalate",
    })
    g.add_edge("escalate",    "execute")
    g.add_edge("save_memory", END)

    return g.compile()


_router = _build()


def route_task(task_type: str, task_input: str, **_) -> dict:
    final = _router.invoke({
        "task_type":   task_type,
        "task_input":  task_input,
        "trial_index": 0,
        "result":      None,
        "success":     False,
        "confidence":  0.0,
        "attempts":    [],
    })
    trial = TRIAL_ORDER[final["trial_index"]]
    return {
        "task_type":      final["task_type"],
        "result":         final["result"],
        "model_used":     trial["name"],
        "provider_used":  trial["provider"],
        "tier_used":      trial["tier"],
        "confidence":     final["confidence"],
        "attempts_count": len(final["attempts"]),
        "attempts":       final["attempts"],
    }
