# Monolith SEO — API Python (FastAPI)

## Requisitos

- Python 3.11+
- [Node.js](https://nodejs.org/) no PATH (`node`) — usado para correr `node_modules/astro/astro.js build` na cópia gerada
- [pnpm](https://pnpm.io) no PATH — `pnpm install --ignore-workspace` na pasta gerada (evita herdar o monorepo da raiz do repo)
- Chave OpenAI em `OPENAI_API_KEY` (para `POST /analyze-url`)

O processo do **uvicorn** precisa de ver o mesmo `pnpm` e `node` que o terminal (PATH). No Windows: `where pnpm` e `where node`.

## Instalação

```bash
cd services/python-api
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
```

Em Windows, se `pip` não estiver no PATH, use: `py -m pip install -r requirements.txt`.

Crie `services/python-api/.env` (ou use variáveis de ambiente):

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## Executar

Na pasta `services/python-api`:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- `GET /health` — health check
- `POST /analyze-url` — corpo `{ "url": "https://exemplo.com.br" }` → scraping + JSON da empresa
- `POST /generate-site` — corpo `{ "domain": "exemplo.com.br", "company": { ... } }` → cópia do template em `generated/`, `pnpm install --ignore-workspace`, build com `node node_modules/astro/astro.js build` (fiável no Windows e fora do workspace pnpm da raiz)
- `GET /download-zip?domain=exemplo.com.br` — ZIP do conteúdo de `generated/<pasta>/dist/`
- `GET /preview/{folder}/` e `GET /preview/{folder}/{filepath}` — ficheiros estáticos do `dist` (o `folder` é o `domain_folder` devolvido pelo generate)

O repositório raiz deve conter `packages/astro-base` (template).

## Next.js (proxy)

Na raiz do monolith-seo, defina `PYTHON_API_URL` e `NEXT_PUBLIC_PYTHON_API_URL` (veja `.env.example`) e use:

- `POST /api/analyze` → repassa para Python `/analyze-url`
- `POST /api/generate` → repassa para Python `/generate-site`
- `GET /api/download?domain=` → repassa para Python `/download-zip`
