"""POST /analyze-url — scraping leve + extração estruturada via LLM."""

from __future__ import annotations

from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl

from core.ai_client import chat_json

router = APIRouter()


class AnalyzeUrlBody(BaseModel):
    url: HttpUrl


_SYSTEM = """Você extrai dados de negócio local no Brasil a partir do conteúdo de uma página web.
Responda APENAS com um objeto JSON válido com as chaves:
name, category, city, state, phone, whatsapp, description, services, primary_color.
- name: nome da empresa ou marca.
- category: ramo principal (ex.: Ar Condicionado, Dentista).
- city e state: UF com 2 letras se inferível (ex.: SP).
- phone e whatsapp: apenas dígitos com DDD (ex.: 11999999999). Se não houver, string vazia.
- description: 1–3 frases em português (pt-BR) para meta/hero.
- services: array de 3 a 8 strings curtas com serviços prováveis.
- primary_color: cor principal em hex (#RRGGBB); se não souber, use #2563EB.
Não inclua markdown nem texto fora do JSON."""


def _scrape_page(url: str) -> dict[str, str]:
    try:
        with httpx.Client(follow_redirects=True, timeout=30.0) as client:
            r = client.get(
                url,
                headers={
                    "User-Agent": "MonolithSEO/0.1 (+https://github.com/)",
                    "Accept": "text/html,application/xhtml+xml",
                },
            )
            r.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Falha ao baixar URL: {e}") from e

    soup = BeautifulSoup(r.text, "html.parser")
    title_el = soup.find("title")
    title = title_el.get_text(strip=True) if title_el else ""

    meta_desc = ""
    m = soup.find("meta", attrs={"name": "description"})
    if m and m.get("content"):
        meta_desc = m["content"].strip()
    if not meta_desc:
        og = soup.find("meta", attrs={"property": "og:description"})
        if og and og.get("content"):
            meta_desc = og["content"].strip()

    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    body = soup.find("body")
    text = body.get_text(separator="\n", strip=True) if body else soup.get_text(separator="\n", strip=True)
    text = "\n".join(line for line in text.splitlines() if line)[:12000]

    return {
        "title": title,
        "meta_description": meta_desc,
        "text_sample": text,
        "final_url": str(r.url),
    }


def _host_from_url(url: str) -> str:
    p = urlparse(url)
    host = (p.hostname or "").lower()
    return host


@router.post("/analyze-url")
def analyze_url(body: AnalyzeUrlBody) -> dict:
    url_str = str(body.url).rstrip("/")
    scraped = _scrape_page(url_str)
    host = _host_from_url(scraped["final_url"])

    user = f"""URL informada: {url_str}
URL final após redirects: {scraped["final_url"]}
Host: {host}

<title>{scraped["title"]}</title>
<meta description>: {scraped["meta_description"]}

Texto visível (amostra):
---
{scraped["text_sample"]}
---
"""

    try:
        data = chat_json(_SYSTEM, user, max_tokens=1200)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Erro na IA: {e}") from e

    company = {
        "name": str(data.get("name") or scraped["title"] or host or "Empresa"),
        "category": str(data.get("category") or "Serviços"),
        "city": str(data.get("city") or ""),
        "state": str(data.get("state") or "").upper()[:2],
        "phone": str(data.get("phone") or ""),
        "whatsapp": str(data.get("whatsapp") or data.get("phone") or ""),
        "description": str(data.get("description") or scraped["meta_description"] or "")[:2000],
        "services": data.get("services") if isinstance(data.get("services"), list) else [],
        "primary_color": str(data.get("primary_color") or "#2563EB"),
    }
    if not company["services"]:
        company["services"] = [company["category"]]

    return {
        "domain": host or "site.local",
        "company": company,
        "scraped": {"title": scraped["title"], "final_url": scraped["final_url"]},
    }
