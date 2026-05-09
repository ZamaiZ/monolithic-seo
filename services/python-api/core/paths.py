"""Normalização de pastas geradas e validação contra path traversal."""

from __future__ import annotations

import re
from pathlib import Path

from config import GENERATED_DIR

_FOLDER_RE = re.compile(r"^[a-z0-9._-]+$")


def domain_folder_name(domain: str) -> str:
    """Nome de pasta seguro derivado do domínio ou URL."""
    d = domain.strip().lower()
    d = re.sub(r"^https?://", "", d)
    d = d.split("/")[0]
    d = re.sub(r"[^a-z0-9._-]+", "-", d)
    return d.strip("-") or "site"


def generated_dist_dir(domain: str) -> Path:
    """Diretório `dist` do build para o domínio normalizado."""
    return GENERATED_DIR / domain_folder_name(domain) / "dist"


def validate_folder_segment(folder: str) -> str:
    """Garante que `folder` é apenas o segmento seguro (sem barras)."""
    if not folder or not _FOLDER_RE.match(folder):
        raise ValueError("Nome de pasta inválido")
    return folder


def resolve_under_dist(dist_root: Path, relative: str) -> Path:
    """
    Resolve `relative` dentro de `dist_root` (já existente).
    Levanta ValueError se sair fora de `dist_root`.
    """
    dist_resolved = dist_root.resolve()
    rel = (relative or "").strip().lstrip("/").replace("\\", "/")
    if not rel or rel.endswith("/"):
        rel = (rel.rstrip("/") + "/index.html") if rel else "index.html"
    rel_path = Path(rel)
    if rel_path.is_absolute() or ".." in rel_path.parts:
        raise ValueError("Caminho inválido")
    candidate = (dist_resolved / rel_path).resolve()
    try:
        candidate.relative_to(dist_resolved)
    except ValueError as e:
        raise ValueError("Caminho fora do diretório permitido") from e
    return candidate
