"""Aplicação FastAPI — análise de URL e geração de site Astro."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.analyze import router as analyze_router
from api.download import router as download_router
from api.generate import router as generate_router
from api.preview import router as preview_router

app = FastAPI(title="Monolith SEO API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router, tags=["analyze"])
app.include_router(generate_router, tags=["generate"])
app.include_router(download_router, tags=["download"])
app.include_router(preview_router, tags=["preview"])


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "monolith-seo-python-api"}
