"""Caminhos e variáveis do serviço Python (Monolith SEO)."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# services/python-api/
SERVICE_ROOT = Path(__file__).resolve().parent
# monolith-seo/
REPO_ROOT = SERVICE_ROOT.parent.parent

_env_template = os.environ.get("ASTRO_TEMPLATE_PATH", "").strip()
_packages_boilerplate = REPO_ROOT / "packages" / "astro-boilerplate"
_sibling_boilerplate = REPO_ROOT.parent / "astro-boilerplate"
_legacy = REPO_ROOT / "packages" / "astro-base"

if _env_template:
    ASTRO_TEMPLATE_DIR = Path(_env_template).expanduser().resolve()
elif _packages_boilerplate.is_dir():
    ASTRO_TEMPLATE_DIR = _packages_boilerplate
elif _sibling_boilerplate.is_dir():
    ASTRO_TEMPLATE_DIR = _sibling_boilerplate
else:
    ASTRO_TEMPLATE_DIR = _legacy

GENERATED_DIR = REPO_ROOT / "generated"

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
