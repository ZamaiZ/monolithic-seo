"""GET /preview/{folder} e /preview/{folder}/{filepath} — ficheiros estáticos do build."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from config import GENERATED_DIR
from core.paths import resolve_under_dist, validate_folder_segment

router = APIRouter()


def _dist_for_folder(folder: str) -> Path:
    try:
        validate_folder_segment(folder)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    dist = (GENERATED_DIR / folder / "dist").resolve()
    if not dist.is_dir():
        raise HTTPException(status_code=404, detail="Build não encontrado")
    return dist


@router.get("/preview/{folder}")
def preview_index(folder: str) -> FileResponse:
    dist = _dist_for_folder(folder)
    try:
        index_path = resolve_under_dist(dist, "index.html")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    if not index_path.is_file():
        raise HTTPException(status_code=404, detail="index.html não encontrado")
    return FileResponse(index_path)


@router.get("/preview/{folder}/{filepath:path}")
def preview_file(folder: str, filepath: str) -> FileResponse:
    dist = _dist_for_folder(folder)
    try:
        file_path = resolve_under_dist(dist, filepath)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Ficheiro não encontrado")
    return FileResponse(file_path)
