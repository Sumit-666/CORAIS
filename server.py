import asyncio
import json
import re

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

from corais.config import TRIAL_ORDER, CONFIDENCE_THRESHOLD
from corais.executor import execute_model
from corais.memory import get_cached_trial, cache_trial, list_memory

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RunRequest(BaseModel):
    job_description: str
    candidate_name: str
    skills: list[str]
    experience: int


def _emit(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


def _parse_raw(raw: str):
    if not raw:
        return raw
    raw = raw.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if m:
        raw = m.group(1).strip()
    try:
        return json.loads(raw)
    except Exception:
        return raw


async def _run_step(step: str, prompt: str, out: list):
    """Streams SSE events for one step and appends (result_str, trial) to `out`."""
    cached = get_cached_trial(step)
    start = cached["trial_index"] if cached else 0

    if cached:
        yield _emit({"type": "model_cached", "step": step,
                     "trial_index": start, "model_name": cached["model_name"]})

    for i in range(start, len(TRIAL_ORDER)):
        trial = TRIAL_ORDER[i]
        yield _emit({"type": "model_trying", "step": step, "trial_index": i,
                     "model_name": trial["name"], "tier": trial["tier"],
                     "provider": trial["provider"]})
        try:
            response = await asyncio.to_thread(
                execute_model, trial["provider"], trial["model"], prompt
            )
            completed  = bool(response.get("completed", False))
            confidence = float(response.get("confidence", 0.0))

            if completed and confidence >= CONFIDENCE_THRESHOLD:
                yield _emit({"type": "model_success", "step": step, "trial_index": i,
                             "model_name": trial["name"], "confidence": confidence})
                if not cached or cached["trial_index"] != i:
                    cache_trial(step, i, trial)
                out.append((response.get("result", ""), trial))
                return
            else:
                yield _emit({"type": "model_failed", "step": step, "trial_index": i})
        except Exception as e:
            yield _emit({"type": "model_failed", "step": step,
                         "trial_index": i, "error": str(e)})

    out.append(("", TRIAL_ORDER[-1]))


@app.post("/api/run")
async def run_pipeline(body: RunRequest):
    async def generate():
        candidate = {
            "name": body.candidate_name,
            "skills": body.skills,
            "experience_years": body.experience,
        }

        # ── Step 1: JD Parsing ──────────────────────────────────────────────
        jd_out = []
        async for chunk in _run_step(
            "jd_parsing",
            f"Extract required technical skills from this job description. "
            f"Return the result as a JSON array of strings only.\n\nJD: {body.job_description}",
            jd_out,
        ):
            yield chunk

        raw = jd_out[0][0] if jd_out else "[]"
        parsed = _parse_raw(raw)
        skills = parsed if isinstance(parsed, list) else \
            [s.strip() for s in str(parsed).split(",") if s.strip()]
        yield _emit({"type": "step_result", "step": "jd_parsing",
                     "result": {"skills": skills}})

        # ── Step 2: Candidate Evaluation ────────────────────────────────────
        eval_out = []
        async for chunk in _run_step(
            "candidate_evaluation",
            f"Evaluate this candidate for a role requiring: {skills}\n\n"
            f"Candidate: {json.dumps(candidate)}\n\n"
            "Return the result as a JSON object with exactly these fields: "
            "overall_score (0-100), strengths (list), gaps (list), "
            "hire_recommendation (yes/maybe/no)",
            eval_out,
        ):
            yield chunk

        raw_eval = eval_out[0][0] if eval_out else "{}"
        evaluation = _parse_raw(raw_eval)
        if not isinstance(evaluation, dict):
            evaluation = {"overall_score": 0, "strengths": [],
                          "gaps": [], "hire_recommendation": "no"}
        yield _emit({"type": "step_result", "step": "candidate_evaluation",
                     "result": evaluation})

        # ── Step 3: Career Advice ────────────────────────────────────────────
        gaps = evaluation.get("gaps", [])
        adv_out = []
        async for chunk in _run_step(
            "career_advice",
            f"A candidate is missing these skills: {gaps}.\n"
            "Give exactly 3 short, actionable improvement tips. Numbered 1. 2. 3.",
            adv_out,
        ):
            yield chunk

        advice = adv_out[0][0] if adv_out else ""
        yield _emit({"type": "step_result", "step": "career_advice",
                     "result": {"advice": advice}})

        yield _emit({"type": "memory_update", "memory": list_memory()})
        yield _emit({"type": "done"})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/memory")
def get_memory():
    return list_memory()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
