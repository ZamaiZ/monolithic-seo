"use client";

import { useCallback, useMemo, useState } from "react";

type Company = {
  name: string;
  category: string;
  city: string;
  state: string;
  phone: string;
  whatsapp: string;
  description: string;
  services: string[];
  primary_color: string;
};

const emptyCompany: Company = {
  name: "",
  category: "",
  city: "",
  state: "",
  phone: "",
  whatsapp: "",
  description: "",
  services: [],
  primary_color: "#4f46e5",
};

function parseErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.error === "string") return d.error;
    const det = d.detail;
    if (typeof det === "string") return det;
    if (Array.isArray(det)) {
      return det
        .map((x) =>
          typeof x === "object" && x !== null && "msg" in x
            ? String((x as { msg: unknown }).msg)
            : JSON.stringify(x),
        )
        .join("; ");
    }
    if (det !== undefined && det !== null && typeof det === "object") {
      return JSON.stringify(det);
    }
  }
  return status >= 500 ? "Erro no servidor" : `Erro ${status}`;
}

export function LandingBuilder() {
  const previewBase = useMemo(
    () => process.env.NEXT_PUBLIC_PYTHON_API_URL?.replace(/\/$/, "") ?? "",
    [],
  );

  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [domain, setDomain] = useState("");
  const [company, setCompany] = useState<Company>(emptyCompany);
  const [servicesText, setServicesText] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [domainFolder, setDomainFolder] = useState<string | null>(null);
  const [buildOk, setBuildOk] = useState(false);

  const analyze = useCallback(async () => {
    setAnalyzeError(null);
    setAnalyzing(true);
    try {
      const trimmed = url.trim();
      if (!trimmed) {
        setAnalyzeError("Indique uma URL.");
        return;
      }
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed.startsWith("http") ? trimmed : `https://${trimmed}` }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnalyzeError(parseErrorMessage(data, res.status));
        return;
      }
      const d = data as Record<string, unknown>;
      const dom = typeof d.domain === "string" ? d.domain : "";
      const comp = d.company as Record<string, unknown> | undefined;
      if (!dom || !comp) {
        setAnalyzeError("Resposta inesperada do servidor.");
        return;
      }
      setDomain(dom);
      setCompany({
        name: String(comp.name ?? ""),
        category: String(comp.category ?? ""),
        city: String(comp.city ?? ""),
        state: String(comp.state ?? ""),
        phone: String(comp.phone ?? ""),
        whatsapp: String(comp.whatsapp ?? comp.phone ?? ""),
        description: String(comp.description ?? ""),
        services: Array.isArray(comp.services)
          ? (comp.services as unknown[]).map((s) => String(s))
          : [],
        primary_color: String(comp.primary_color ?? "#4f46e5"),
      });
      setServicesText(
        Array.isArray(comp.services)
          ? (comp.services as unknown[]).map((s) => String(s)).join("\n")
          : "",
      );
      setGenerateError(null);
      setDomainFolder(null);
      setBuildOk(false);
    } finally {
      setAnalyzing(false);
    }
  }, [url]);

  const updateCompany = useCallback((patch: Partial<Company>) => {
    setCompany((c) => ({ ...c, ...patch }));
  }, []);

  const generate = useCallback(async () => {
    setGenerateError(null);
    setGenerating(true);
    setBuildOk(false);
    setDomainFolder(null);
    try {
      const services = servicesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const body = {
        domain: domain.trim(),
        company: {
          ...company,
          services: services.length ? services : company.services,
        },
      };
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = parseErrorMessage(data, res.status);
        const extra = data as Record<string, unknown>;
        const detail = extra.detail;
        const nested =
          typeof detail === "object" && detail !== null && !Array.isArray(detail)
            ? (detail as Record<string, unknown>)
            : null;
        const src = nested ?? extra;
        const tail =
          typeof src.stderr === "string" && src.stderr
            ? `\n\n${String(src.stderr).slice(-1200)}`
            : typeof src.stdout === "string" && src.stdout
              ? `\n\n${String(src.stdout).slice(-1200)}`
              : "";
        setGenerateError(msg + tail);
        return;
      }
      const ok = (data as Record<string, unknown>).ok === true;
      const folder = (data as Record<string, unknown>).domain_folder;
      if (!ok || typeof folder !== "string") {
        setGenerateError(typeof data === "object" ? JSON.stringify(data) : "Build sem confirmação.");
        return;
      }
      setDomainFolder(folder);
      setBuildOk(true);
    } finally {
      setGenerating(false);
    }
  }, [company, domain, servicesText]);

  const downloadHref = domain.trim()
    ? `/api/download?domain=${encodeURIComponent(domain.trim())}`
    : "#";

  const previewSrc =
    previewBase && domainFolder ? `${previewBase}/preview/${domainFolder}/` : "";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-12 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">Monolith SEO</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Gerador de landing estática
        </h1>
        <p className="text-lg text-zinc-600">
          Analise um site, ajuste os dados inferidos pela IA, gere a página em Astro e descarregue o ZIP pronto a
          publicar.
        </p>
      </header>

      <section aria-labelledby="step1" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 id="step1" className="text-lg font-semibold text-zinc-900">
          1. URL do site
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Usamos o conteúdo público da página (título, meta e texto) para a IA extrair nome, ramo, local e contactos.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium text-zinc-700">
            <span>URL</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://empresa.com.br"
              className="rounded-xl border border-zinc-300 px-3 py-2 text-base text-zinc-900 outline-none ring-indigo-500 focus:border-indigo-500 focus:ring-2"
              disabled={analyzing}
              autoComplete="url"
            />
          </label>
          <button
            type="button"
            onClick={() => void analyze()}
            disabled={analyzing}
            aria-busy={analyzing}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {analyzing ? "A analisar…" : "Analisar site"}
          </button>
        </div>
        {analyzeError ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {analyzeError}
          </p>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {analyzing ? "Análise em curso." : ""}
        </p>
      </section>

      {domain ? (
        <section aria-labelledby="step2" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 id="step2" className="text-lg font-semibold text-zinc-900">
            2. Dados da empresa
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Revise e edite os campos antes de gerar. Estes valores alimentam o template Astro (hero, CTAs e SEO).
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 sm:col-span-2">
              <span>Domínio canónico</span>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              <span>Nome</span>
              <input
                value={company.name}
                onChange={(e) => updateCompany({ name: e.target.value })}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              <span>Ramo / categoria</span>
              <input
                value={company.category}
                onChange={(e) => updateCompany({ category: e.target.value })}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              <span>Cidade</span>
              <input
                value={company.city}
                onChange={(e) => updateCompany({ city: e.target.value })}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              <span>UF</span>
              <input
                value={company.state}
                onChange={(e) => updateCompany({ state: e.target.value.toUpperCase().slice(0, 2) })}
                maxLength={2}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              <span>Telefone (só dígitos / DDD)</span>
              <input
                value={company.phone}
                onChange={(e) => updateCompany({ phone: e.target.value })}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              <span>WhatsApp (só dígitos / DDD)</span>
              <input
                value={company.whatsapp}
                onChange={(e) => updateCompany({ whatsapp: e.target.value })}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 sm:col-span-2">
              <span>Cor principal (hex)</span>
              <input
                type="text"
                value={company.primary_color}
                onChange={(e) => updateCompany({ primary_color: e.target.value })}
                className="rounded-xl border border-zinc-300 px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 sm:col-span-2">
              <span>Descrição (hero / meta)</span>
              <textarea
                value={company.description}
                onChange={(e) => updateCompany({ description: e.target.value })}
                rows={4}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 sm:col-span-2">
              <span>Serviços (um por linha)</span>
              <textarea
                value={servicesText}
                onChange={(e) => setServicesText(e.target.value)}
                rows={5}
                placeholder={"Instalação\nManutenção"}
                className="rounded-xl border border-zinc-300 px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </label>
          </div>
        </section>
      ) : null}

      {domain ? (
        <section aria-labelledby="step3" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 id="step3" className="text-lg font-semibold text-zinc-900">
            3. Gerar landing (Astro)
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Isto pode demorar vários minutos na primeira vez (instalação de dependências e build estático).
          </p>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating || !domain.trim()}
            aria-busy={generating}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? "A gerar…" : "Gerar site"}
          </button>
          {generateError ? (
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-red-50 px-3 py-2 text-xs text-red-900" role="alert">
              {generateError}
            </pre>
          ) : null}
          <p className="sr-only" aria-live="polite">
            {generating ? "Geração em curso." : ""}
          </p>
        </section>
      ) : null}

      {buildOk && domainFolder ? (
        <section aria-labelledby="step4" className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
          <h2 id="step4" className="text-lg font-semibold text-emerald-950">
            4. Resultado
          </h2>
          <p className="mt-1 text-sm text-emerald-900/90">
            Build concluído. Pode descarregar o pacote ZIP ou pré-visualizar a página servida pelo API Python.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={downloadHref}
              download
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Baixar ZIP
            </a>
            {previewSrc ? (
              <a
                href={previewSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-700 px-5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
              >
                Abrir preview noutro separador
              </a>
            ) : null}
          </div>
          {previewSrc ? (
            <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-inner">
              <p className="border-b border-zinc-100 px-3 py-2 text-xs font-medium text-zinc-500">Pré-visualização</p>
              <iframe
                title="Pré-visualização da landing gerada"
                src={previewSrc}
                className="h-[min(70vh,520px)] w-full border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-600">
              Defina <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">NEXT_PUBLIC_PYTHON_API_URL</code>{" "}
              no <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">.env.local</code> para ver o iframe
              de preview.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
