"""GET /download-zip — empacota `generated/{folder}/dist` em ZIP."""

from __future__ import annotations

import io
import zipfile

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from core.paths import domain_folder_name, generated_dist_dir, validate_folder_segment

router = APIRouter()


@router.get("/download-zip")
def download_zip(domain: str = Query(..., description="Domínio ou URL usada no build")) -> Response:
    folder = domain_folder_name(domain)
    try:
        validate_folder_segment(folder)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    dist = generated_dist_dir(domain)
    if not dist.is_dir():
        raise HTTPException(
            status_code=404,
            detail=f"Pasta dist não encontrada para '{folder}'. Gere o site primeiro.",
        )

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(dist.rglob("*")):
            if path.is_file():
                arcname = path.relative_to(dist).as_posix()
                zf.write(path, arcname)

    buffer.seek(0)
    body = buffer.getvalue()
    filename = f"{folder}.zip"
    return Response(
        content=body,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
