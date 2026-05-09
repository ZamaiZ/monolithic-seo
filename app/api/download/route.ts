import { NextResponse } from "next/server";

const PYTHON_API = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

export const maxDuration = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  if (!domain?.trim()) {
    return NextResponse.json({ error: "Parâmetro domain é obrigatório" }, { status: 400 });
  }

  const upstream = new URL("/download-zip", PYTHON_API);
  upstream.searchParams.set("domain", domain.trim());

  const res = await fetch(upstream.toString(), { method: "GET", redirect: "manual" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: text || `Upstream ${res.status}` },
      { status: res.status >= 400 ? res.status : 502 },
    );
  }

  const contentType = res.headers.get("content-type") ?? "application/zip";
  const disposition = res.headers.get("content-disposition") ?? undefined;
  const buf = await res.arrayBuffer();

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  if (disposition) {
    headers.set("Content-Disposition", disposition);
  }

  return new NextResponse(buf, { status: 200, headers });
}
