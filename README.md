This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Monolith SEO (stack)

Este repositório é um **pnpm workspace**:

| Parte | Pasta | Descrição |
|--------|--------|-----------|
| **Admin / painel** | raiz (`app/`) | Next.js 16 — UI e proxies HTTP |
| **Template Astro** | `packages/astro-base` | Landing estática (Hero, Serviços, Contato) + `src/data/site.json` |
| **API Python** | `services/python-api` | FastAPI — análise (`/analyze-url`), geração (`/generate-site`), ZIP (`/download-zip`) e preview (`/preview/...`) |
| **Saída gerada** | `generated/` (gitignored) | Cópias por domínio + `dist/` após `astro build` |

### Variáveis de ambiente (Next)

Copie [`.env.example`](.env.example) para `.env.local` e ajuste se necessário:

- `PYTHON_API_URL` — URL do FastAPI para o **servidor** Next fazer proxy (padrão `http://127.0.0.1:8000`)
- `NEXT_PUBLIC_PYTHON_API_URL` — mesma URL (ou URL pública) para o **browser** — iframe de preview na home

### Fluxo na UI (`/`)

1. Inserir URL e **Analisar site** (IA + scrape).
2. Rever ou editar dados e **Gerar site** (build Astro no Python).
3. **Baixar ZIP** e/ou ver o **preview** (iframe aponta para o API Python).

Rotas de proxy no Next:

- `POST /api/analyze` → Python `/analyze-url`
- `POST /api/generate` → Python `/generate-site`
- `GET /api/download?domain=` → Python `/download-zip` (ZIP binário)

Detalhes do backend: [`services/python-api/README.md`](services/python-api/README.md).

### Comandos úteis

```bash
pnpm install
pnpm dev
pnpm --filter @monolith-seo/astro-base build
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
