import json
import os
import re

from .config import ROUTER_SYSTEM_PROMPT


def _parse_json(text: str) -> dict:
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        text = match.group(1).strip()
    return json.loads(text)


def _call_anthropic(model_id: str, task_input: str) -> dict:
    import anthropic
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model=model_id,
        max_tokens=2048,
        system=ROUTER_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": task_input}],
    )
    return _parse_json(response.content[0].text)


def _call_openai(model_id: str, task_input: str) -> dict:
    from openai import OpenAI
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model=model_id,
        messages=[
            {"role": "system", "content": ROUTER_SYSTEM_PROMPT},
            {"role": "user", "content": task_input},
        ],
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


def _call_google(model_id: str, task_input: str) -> dict:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    model = genai.GenerativeModel(
        model_name=model_id,
        system_instruction=ROUTER_SYSTEM_PROMPT,
    )
    response = model.generate_content(task_input)
    return _parse_json(response.text)


_CALLERS = {
    "anthropic": _call_anthropic,
    "openai": _call_openai,
    "google": _call_google,
}


def execute_model(provider: str, model_id: str, task_input: str) -> dict:
    caller = _CALLERS.get(provider)
    if not caller:
        raise ValueError(f"Unknown provider: {provider}")
    return caller(model_id, task_input)
