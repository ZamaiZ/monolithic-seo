"""Cliente OpenAI para texto estruturado (JSON)."""

from __future__ import annotations

import json
import time
from typing import Any

from openai import OpenAI

from config import OPENAI_API_KEY, OPENAI_MODEL


def chat_json(system: str, user: str, *, max_tokens: int = 2000) -> dict[str, Any]:
    """Chama o modelo e devolve um objeto JSON (dict)."""
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY não configurada")

    client = OpenAI(api_key=OPENAI_API_KEY)
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                response_format={"type": "json_object"},
                temperature=0.4,
                max_tokens=max_tokens,
            )
            content = resp.choices[0].message.content or "{}"
            return json.loads(content)
        except Exception as e:  # noqa: BLE001
            last_err = e
            time.sleep(2**attempt)
    raise last_err or RuntimeError("Falha na chamada OpenAI")
