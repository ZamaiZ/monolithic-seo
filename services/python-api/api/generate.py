"""POST /generate-site — copia template Astro, grava dados e faz build."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.astro_builder import build_site

router = APIRouter()


class CompanyPayload(BaseModel):
    name: str
    category: str
    city: str = ""
    state: str = ""
    phone: str = ""
    whatsapp: str = ""
    description: str = ""
    services: list[str] = Field(default_factory=list)
    primary_color: str = "#2563EB"


class GenerateSiteBody(BaseModel):
    domain: str
    company: CompanyPayload


@router.post("/generate-site")
def generate_site(body: GenerateSiteBody) -> dict:
    if not body.domain.strip():
        raise HTTPException(status_code=400, detail="domain é obrigatório")

    try:
        result = build_site(domain=body.domain.strip(), company=body.company.model_dump())
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Build falhou: {e}") from e

    if not result.get("ok"):
        raise HTTPException(status_code=500, detail=result)

    return result
