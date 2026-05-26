import asyncio
import json
import re
import time
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

load_dotenv()

from corais.config import CONFIDENCE_THRESHOLD
from corais.executor import execute_model
from corais.memory import get_cached_trial, cache_trial, list_memory
from corais.registry import (
    MODEL_REGISTRY, get_task_trial_sequence, get_task_priority, calculate_cost, toggle_model,
)
from corais.budget import can_process, record_spend, get_budget_status, get_tier
from corais import cache as prompt_cache
from corais.logger import append_log, get_logs, get_today_stats
from corais.database import get_db, init_db
from corais.resume import extract_text as extract_resume_text
from corais.models import Admin, User, UserRole
from corais.auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, require_admin, require_superadmin,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS_FILE = Path("jobs.json")


# ── Job storage ───────────────────────────────────────────────────────────────

def _load_jobs() -> list:
    if JOBS_FILE.exists():
        try:
            return json.loads(JOBS_FILE.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []


def _save_jobs(jobs: list) -> None:
    JOBS_FILE.write_text(json.dumps(jobs, indent=2), encoding="utf-8")


# ── Request / response models ─────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateRoleRequest(BaseModel):
    role: UserRole


class AdminCreateRequest(BaseModel):
    email: str
    username: str
    password: str
    role: UserRole = UserRole.admin


class JobPost(BaseModel):
    title: str
    company: str
    description: str


class RunRequest(BaseModel):
    candidate_name: str
    skills: list[str]
    experience: int


# ── SSE helpers ───────────────────────────────────────────────────────────────

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


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "role": user.role,
    }


# ── Core streaming step ───────────────────────────────────────────────────────

async def _run_step(step: str, prompt: str, out: list):
    """
    Streams SSE events for one step and appends (result_str, trial) to `out`.

    Decision Gate stages executed here:
      1. Prompt cache check (in-memory, TTL-based)
      2. Budget check (task_priority vs current spend tier)
      3. Model memory hint (which model worked last time)
      4. Model trial loop with cost tracking and routing logs
    """
    budget_tier   = get_tier()
    task_priority = get_task_priority(step)

    # ── Stage 1: Prompt cache ────────────────────────────────────────────────
    cached_result = prompt_cache.get(step, prompt)
    if cached_result is not None:
        result_str, trial = cached_result
        trial_index = trial["trial_index"]
        yield _emit({
            "type": "model_cached", "step": step,
            "trial_index": trial_index, "model_name": trial["name"],
            "from_prompt_cache": True, "budget_tier": budget_tier,
        })
        out.append((result_str, trial))
        return

    # ── Stage 2: Budget check ────────────────────────────────────────────────
    if not can_process(task_priority):
        yield _emit({
            "type": "budget_blocked", "step": step,
            "budget_tier": budget_tier, "task_priority": task_priority,
        })
        out.append(("", {}))
        return

    # ── Stage 3: Model memory hint ───────────────────────────────────────────
    memory = get_cached_trial(step)
    cached_model_id = memory["model_id"] if memory else None

    sequence = get_task_trial_sequence(step)

    start_idx = 0
    if cached_model_id:
        for i, trial in enumerate(sequence):
            if trial["model"] == cached_model_id:
                start_idx = i
                break
        if start_idx == 0 and cached_model_id:
            yield _emit({
                "type": "model_cached", "step": step,
                "trial_index": memory["trial_index"],
                "model_name": memory["model_name"],
                "budget_tier": budget_tier,
            })

    if memory and start_idx > 0:
        yield _emit({
            "type": "model_cached", "step": step,
            "trial_index": sequence[start_idx]["trial_index"],
            "model_name": sequence[start_idx]["name"],
            "budget_tier": budget_tier,
        })

    # ── Stage 4: Model trial loop ────────────────────────────────────────────
    for trial in sequence[start_idx:]:
        trial_index = trial["trial_index"]
        model_id    = trial["model"]

        yield _emit({
            "type": "model_trying", "step": step,
            "trial_index": trial_index, "model_name": trial["name"],
            "tier": trial["tier"], "provider": trial["provider"],
            "budget_tier": budget_tier,
        })

        t0 = time.monotonic()
        try:
            response = await asyncio.to_thread(
                execute_model, trial["provider"], model_id, prompt
            )
            latency_ms = int((time.monotonic() - t0) * 1000)

            completed  = bool(response.get("completed", False))
            confidence = float(response.get("confidence", 0.0))
            usage      = response.get("_usage", {"input_tokens": 0, "output_tokens": 0})
            cost       = calculate_cost(model_id, usage["input_tokens"], usage["output_tokens"])

            if completed and confidence >= CONFIDENCE_THRESHOLD:
                record_spend(cost)
                append_log({
                    "prompt_type": step,
                    "model_id":    model_id,
                    "model_name":  trial["name"],
                    "cost_usd":    cost,
                    "latency_ms":  latency_ms,
                    "cache_hit":   False,
                    "budget_tier": budget_tier,
                    "input_tokens":  usage["input_tokens"],
                    "output_tokens": usage["output_tokens"],
                })
                yield _emit({
                    "type": "model_success", "step": step,
                    "trial_index": trial_index, "model_name": trial["name"],
                    "confidence": confidence, "cost_usd": cost,
                    "budget_tier": budget_tier,
                })

                if not memory or memory["model_id"] != model_id:
                    cache_trial(step, trial_index, trial)

                result_str = response.get("result", "")
                prompt_cache.set(step, prompt, (result_str, trial))
                out.append((result_str, trial))
                return

            else:
                yield _emit({
                    "type": "model_failed", "step": step,
                    "trial_index": trial_index,
                })

        except Exception as e:
            latency_ms = int((time.monotonic() - t0) * 1000)
            yield _emit({
                "type": "model_failed", "step": step,
                "trial_index": trial_index, "error": str(e),
            })

    out.append(("", sequence[-1] if sequence else {}))


# ── Auth endpoints ────────────────────────────────────────────────────────────

@app.post("/api/auth/register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(
        email=body.email,
        username=body.username,
        hashed_password=get_password_hash(body.password),
        role=UserRole.user,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id), "table": "users"})
    return {"access_token": token, "token_type": "bearer", "user": _user_dict(user)}


@app.post("/api/auth/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    token = create_access_token({"sub": str(user.id), "table": "users"})
    return {"access_token": token, "token_type": "bearer", "user": _user_dict(user)}


@app.get("/api/auth/me")
def me(current_user=Depends(get_current_user)):
    return _user_dict(current_user)


# ── Admin login (checks admins table) ────────────────────────────────────────

@app.post("/api/auth/admin/login")
def admin_login(body: LoginRequest, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.email == body.email).first()
    if not admin or not verify_password(body.password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not admin.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    token = create_access_token({"sub": str(admin.id), "table": "admins"})
    return {"access_token": token, "token_type": "bearer", "user": _user_dict(admin)}


@app.post("/api/auth/admin/bootstrap")
def admin_bootstrap(body: AdminCreateRequest, db: Session = Depends(get_db)):
    """Create the first superadmin. Fails if any admin already exists."""
    if db.query(Admin).count() > 0:
        raise HTTPException(status_code=403, detail="Admin already bootstrapped. Contact your superadmin.")
    if db.query(Admin).filter(Admin.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    admin = Admin(
        email=body.email,
        username=body.username,
        hashed_password=get_password_hash(body.password),
        role=UserRole.superadmin,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    token = create_access_token({"sub": str(admin.id), "table": "admins"})
    return {"access_token": token, "token_type": "bearer", "user": _user_dict(admin)}


# ── Admin account management (superadmin only) ────────────────────────────────

@app.get("/api/admin/admins")
def list_admins(db: Session = Depends(get_db), _=Depends(require_superadmin)):
    admins = db.query(Admin).order_by(Admin.created_at).all()
    return [
        {
            "id": a.id, "email": a.email, "username": a.username,
            "role": a.role, "is_active": a.is_active,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in admins
    ]


@app.post("/api/admin/admins")
def create_admin(body: AdminCreateRequest, db: Session = Depends(get_db), _=Depends(require_superadmin)):
    if body.role == UserRole.user:
        raise HTTPException(status_code=400, detail="Use /api/auth/register to create user accounts")
    if db.query(Admin).filter(Admin.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(Admin).filter(Admin.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    admin = Admin(
        email=body.email,
        username=body.username,
        hashed_password=get_password_hash(body.password),
        role=body.role,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return _user_dict(admin)


# ── User management (superadmin only) ────────────────────────────────────────

@app.get("/api/admin/users")
def list_users(db: Session = Depends(get_db), _: User = Depends(require_superadmin)):
    users = db.query(User).order_by(User.created_at).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "username": u.username,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@app.patch("/api/admin/users/{user_id}/role")
def update_user_role(
    user_id: int,
    body: UpdateRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = body.role
    db.commit()
    return _user_dict(user)


@app.delete("/api/admin/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"deleted": True}


# ── Job endpoints ─────────────────────────────────────────────────────────────

@app.get("/api/jobs")
def list_jobs(_: User = Depends(get_current_user)):
    return _load_jobs()


@app.post("/api/jobs")
def post_job(body: JobPost, _: User = Depends(require_admin)):
    jobs = _load_jobs()
    job  = {"id": len(jobs) + 1, **body.model_dump()}
    jobs.append(job)
    _save_jobs(jobs)
    return job


@app.get("/api/job")
def get_current_job(_: User = Depends(get_current_user)):
    jobs = _load_jobs()
    if not jobs:
        raise HTTPException(status_code=404, detail="No job posted yet")
    return jobs[-1]


@app.post("/api/apply")
async def apply_job(
    candidate_name: str = Form(...),
    experience: int = Form(...),
    resume: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    jobs = _load_jobs()
    if not jobs:
        raise HTTPException(status_code=400, detail="No active job posting")
    current_job     = jobs[-1]
    job_description = current_job["description"]
    job_title       = current_job.get("title", "the role")
    job_company     = current_job.get("company", "the company")

    content     = await resume.read()
    resume_text = extract_resume_text(resume.filename or "resume.txt", content)

    async def generate():
        # ── Step 1: Resume Parse ─────────────────────────────────────────────
        parse_prompt = (
            "Extract professional skills, technologies, and qualifications from this resume. "
            "Return a JSON array of strings only, each being a specific skill or technology.\n\n"
            f"Resume:\n{resume_text[:4000]}"
        )
        parse_out = []
        async for chunk in _run_step("resume_parse", parse_prompt, parse_out):
            yield chunk

        raw_skills    = parse_out[0][0] if parse_out else "[]"
        parsed_skills = _parse_raw(raw_skills)
        skills        = parsed_skills if isinstance(parsed_skills, list) else \
            [s.strip() for s in str(parsed_skills).split(",") if s.strip()]
        yield _emit({"type": "step_result", "step": "resume_parse",
                     "result": {"skills": skills}})

        candidate = {"name": candidate_name, "skills": skills, "experience_years": experience}

        # ── Step 2: JD Parsing ───────────────────────────────────────────────
        jd_prompt = (
            "Extract required technical skills from this job description. "
            "Return the result as a JSON array of strings only.\n\n"
            f"JD: {job_description}"
        )
        jd_out = []
        async for chunk in _run_step("jd_parsing", jd_prompt, jd_out):
            yield chunk

        raw       = jd_out[0][0] if jd_out else "[]"
        parsed    = _parse_raw(raw)
        jd_skills = parsed if isinstance(parsed, list) else \
            [s.strip() for s in str(parsed).split(",") if s.strip()]
        yield _emit({"type": "step_result", "step": "jd_parsing",
                     "result": {"skills": jd_skills}})

        # ── Step 3: Candidate Evaluation ─────────────────────────────────────
        eval_prompt = (
            f"Evaluate this candidate for a role requiring: {jd_skills}\n\n"
            f"Candidate: {json.dumps(candidate)}\n\n"
            "Return a JSON object with exactly these fields: "
            "overall_score (0-100), strengths (list), gaps (list), "
            "hire_recommendation (yes/maybe/no)"
        )
        eval_out = []
        async for chunk in _run_step("candidate_evaluation", eval_prompt, eval_out):
            yield chunk

        raw_eval   = eval_out[0][0] if eval_out else "{}"
        evaluation = _parse_raw(raw_eval)
        if not isinstance(evaluation, dict):
            evaluation = {"overall_score": 0, "strengths": [],
                          "gaps": [], "hire_recommendation": "no"}
        yield _emit({"type": "step_result", "step": "candidate_evaluation",
                     "result": evaluation})

        # ── Step 4: Career Advice ─────────────────────────────────────────────
        gaps       = evaluation.get("gaps", [])
        adv_prompt = (
            f"A candidate is missing these skills: {gaps}.\n"
            "Give exactly 3 short, actionable improvement tips. Numbered 1. 2. 3."
        )
        adv_out = []
        async for chunk in _run_step("career_advice", adv_prompt, adv_out):
            yield chunk

        advice = adv_out[0][0] if adv_out else ""
        yield _emit({"type": "step_result", "step": "career_advice",
                     "result": {"advice": advice}})

        # ── Step 5: Cover Letter ──────────────────────────────────────────────
        cl_prompt = (
            f"Write a professional cover letter for {candidate_name} applying for "
            f"{job_title} at {job_company}.\n\n"
            f"Candidate Profile:\n"
            f"- Skills: {', '.join(skills)}\n"
            f"- Experience: {experience} years\n\n"
            f"Role Requirements (JD Role DNA):\n"
            f"- Required skills: {', '.join(jd_skills)}\n\n"
            "Write a concise 3-paragraph cover letter addressed to the Hiring Team. "
            "Return only the cover letter text, no extra commentary."
        )
        cl_out = []
        async for chunk in _run_step("cover_letter", cl_prompt, cl_out):
            yield chunk

        letter = cl_out[0][0] if cl_out else ""
        yield _emit({"type": "step_result", "step": "cover_letter",
                     "result": {"letter": letter}})

        yield _emit({"type": "memory_update", "memory": list_memory()})
        yield _emit({"type": "done"})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Main pipeline ─────────────────────────────────────────────────────────────

@app.post("/api/run")
async def run_pipeline(body: RunRequest, _: User = Depends(get_current_user)):
    jobs = _load_jobs()
    if not jobs:
        raise HTTPException(status_code=400, detail="No active job posting")
    current_job     = jobs[-1]
    job_description = current_job["description"]
    job_title       = current_job.get("title", "the role")
    job_company     = current_job.get("company", "the company")

    async def generate():
        candidate = {
            "name":             body.candidate_name,
            "skills":           body.skills,
            "experience_years": body.experience,
        }

        # ── Step 1: JD Parsing ───────────────────────────────────────────────
        jd_prompt = (
            "Extract required technical skills from this job description. "
            "Return the result as a JSON array of strings only.\n\n"
            f"JD: {job_description}"
        )
        jd_out = []
        async for chunk in _run_step("jd_parsing", jd_prompt, jd_out):
            yield chunk

        raw    = jd_out[0][0] if jd_out else "[]"
        parsed = _parse_raw(raw)
        skills = parsed if isinstance(parsed, list) else \
            [s.strip() for s in str(parsed).split(",") if s.strip()]
        yield _emit({"type": "step_result", "step": "jd_parsing",
                     "result": {"skills": skills}})

        # ── Step 2: Candidate Evaluation ─────────────────────────────────────
        eval_prompt = (
            f"Evaluate this candidate for a role requiring: {skills}\n\n"
            f"Candidate: {json.dumps(candidate)}\n\n"
            "Return a JSON object with exactly these fields: "
            "overall_score (0-100), strengths (list), gaps (list), "
            "hire_recommendation (yes/maybe/no)"
        )
        eval_out = []
        async for chunk in _run_step("candidate_evaluation", eval_prompt, eval_out):
            yield chunk

        raw_eval   = eval_out[0][0] if eval_out else "{}"
        evaluation = _parse_raw(raw_eval)
        if not isinstance(evaluation, dict):
            evaluation = {"overall_score": 0, "strengths": [],
                          "gaps": [], "hire_recommendation": "no"}
        yield _emit({"type": "step_result", "step": "candidate_evaluation",
                     "result": evaluation})

        # ── Step 3: Career Advice ─────────────────────────────────────────────
        gaps = evaluation.get("gaps", [])
        adv_prompt = (
            f"A candidate is missing these skills: {gaps}.\n"
            "Give exactly 3 short, actionable improvement tips. Numbered 1. 2. 3."
        )
        adv_out = []
        async for chunk in _run_step("career_advice", adv_prompt, adv_out):
            yield chunk

        advice = adv_out[0][0] if adv_out else ""
        yield _emit({"type": "step_result", "step": "career_advice",
                     "result": {"advice": advice}})

        # ── Step 4: Cover Letter Generation ──────────────────────────────────
        cl_prompt = (
            f"Write a professional cover letter for {candidate['name']} applying for "
            f"{job_title} at {job_company}.\n\n"
            f"Candidate Profile:\n"
            f"- Skills: {', '.join(candidate['skills'])}\n"
            f"- Experience: {candidate['experience_years']} years\n\n"
            f"Role Requirements (JD Role DNA):\n"
            f"- Required skills: {', '.join(skills)}\n\n"
            "Write a concise 3-paragraph cover letter addressed to the Hiring Team. "
            "Be specific about how the candidate's skills match the role requirements. "
            "Return only the cover letter text, no extra commentary."
        )
        cl_out = []
        async for chunk in _run_step("cover_letter", cl_prompt, cl_out):
            yield chunk

        letter = cl_out[0][0] if cl_out else ""
        yield _emit({"type": "step_result", "step": "cover_letter",
                     "result": {"letter": letter}})

        yield _emit({"type": "memory_update", "memory": list_memory()})
        yield _emit({"type": "done"})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Memory endpoint ───────────────────────────────────────────────────────────

@app.get("/api/memory")
def get_memory(_: User = Depends(get_current_user)):
    return list_memory()


# ── Admin endpoints ───────────────────────────────────────────────────────────

@app.get("/api/admin/stats")
def admin_stats(_: User = Depends(require_admin)):
    return {
        "budget":  get_budget_status(),
        "cache":   prompt_cache.get_stats(),
        "routing": get_today_stats(),
    }


@app.get("/api/admin/logs")
def admin_logs(limit: int = 50, _: User = Depends(require_admin)):
    return get_logs(limit)


@app.get("/api/admin/models")
def admin_models(_: User = Depends(require_admin)):
    return MODEL_REGISTRY


@app.patch("/api/admin/models/{model_id}/toggle")
def admin_toggle_model(model_id: str, _: User = Depends(require_admin)):
    if model_id not in MODEL_REGISTRY:
        raise HTTPException(status_code=404, detail="Model not found")
    toggle_model(model_id)
    return MODEL_REGISTRY[model_id]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
