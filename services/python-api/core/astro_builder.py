"""Copia o template Astro, grava site.json e executa astro build."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

from config import ASTRO_TEMPLATE_DIR, GENERATED_DIR
from core.paths import domain_folder_name


def _pnpm_executable() -> str:
    """Resolve o caminho absoluto do pnpm (Windows: pnpm.cmd)."""
    exe = shutil.which("pnpm")
    if exe:
        return exe
    if sys.platform == "win32":
        cmd = shutil.which("pnpm.cmd")
        if cmd:
            return cmd
    raise FileNotFoundError(
        "pnpm não encontrado no PATH do processo Python; instale o pnpm globalmente "
        "ou inicie o uvicorn a partir de um ambiente onde `pnpm` esteja no PATH."
    )


def _ignore_copy(dir_path: str, names: list[str]) -> set[str]:  # noqa: ARG001
    skip = {"node_modules", "dist", ".astro", ".git", "__pycache__"}
    return {n for n in names if n in skip}


def _run_step(args: list[str], *, cwd: Path, label: str) -> dict | None:
    """Executa um passo; devolve dict de erro se falhar, senão None."""
    proc = subprocess.run(
        args,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=600,
        shell=False,
    )
    if proc.returncode != 0:
        return {
            "ok": False,
            "error": f"{label} falhou (exit {proc.returncode})",
            "stdout": proc.stdout[-4000:] if proc.stdout else "",
            "stderr": proc.stderr[-4000:] if proc.stderr else "",
            "dest": str(cwd),
        }
    return None


def build_site(*, domain: str, company: dict) -> dict:
    """
    Copia o template Astro para generated/{domain}/,
    escreve src/data/site.json, pnpm install --ignore-workspace e pnpm run build.
    """
    if not ASTRO_TEMPLATE_DIR.is_dir():
        raise FileNotFoundError(f"Template Astro não encontrado: {ASTRO_TEMPLATE_DIR}")

    folder = domain_folder_name(domain)
    dest = GENERATED_DIR / folder
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)

    if dest.exists():
        shutil.rmtree(dest)

    shutil.copytree(ASTRO_TEMPLATE_DIR, dest, ignore=_ignore_copy)

    site_payload = {"company": company, "domain": domain.strip()}
    data_path = dest / "src" / "data" / "site.json"
    data_path.parent.mkdir(parents=True, exist_ok=True)
    data_path.write_text(json.dumps(site_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    pnpm_exe = _pnpm_executable()

    # --ignore-workspace: generated/ está sob a raiz com pnpm-workspace.yaml mas não é membro do workspace.
    err = _run_step(
        [pnpm_exe, "install", "--ignore-workspace"],
        cwd=dest,
        label="pnpm install --ignore-workspace",
    )
    if err:
        return err

    # Usa o script "build" do package.json (pnpm resolve astro em .bin / layout .pnpm).
    # Evita depender de node_modules/astro/astro.js, que pode não existir como arquivo real no Windows/pnpm.
    err = _run_step(
        [pnpm_exe, "run", "build"],
        cwd=dest,
        label="pnpm run build",
    )
    if err:
        return err

    dist = dest / "dist"
    return {
        "ok": True,
        "domain_folder": folder,
        "dest": str(dest),
        "dist": str(dist) if dist.is_dir() else str(dest),
    }
