import os
import shutil
import subprocess
import tempfile

# Common install locations, checked when `soffice` isn't on PATH (very common on
# Windows, where the LibreOffice installer doesn't add itself to PATH by default).
_WINDOWS_FALLBACK_PATHS = [
    r"C:\Program Files\LibreOffice\program\soffice.exe",
    r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
]


def _find_soffice() -> str | None:
    on_path = shutil.which("soffice") or shutil.which("soffice.exe")
    if on_path:
        return on_path
    for candidate in _WINDOWS_FALLBACK_PATHS:
        if os.path.exists(candidate):
            return candidate
    return None


def pptx_to_pdf(pptx_path: str) -> str:
    """Convert a .pptx file to .pdf using headless LibreOffice.
    Returns the path to the generated PDF. Requires LibreOffice to be installed
    (see Dockerfile for the containerized setup). Raises RuntimeError if conversion
    fails or LibreOffice can't be found either on PATH or in a standard install location."""
    soffice_path = _find_soffice()
    if soffice_path is None:
        raise RuntimeError(
            "LibreOffice ('soffice') was not found on PATH or in the standard install "
            "locations. PDF export requires it — see the project Dockerfile, or install "
            "LibreOffice and make sure soffice.exe is under Program Files."
        )

    out_dir = tempfile.mkdtemp()
    result = subprocess.run(
        [soffice_path, "--headless", "--convert-to", "pdf", "--outdir", out_dir, pptx_path],
        capture_output=True, text=True, timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"LibreOffice conversion failed: {result.stderr}")

    base_name = os.path.splitext(os.path.basename(pptx_path))[0]
    pdf_path = os.path.join(out_dir, f"{base_name}.pdf")
    if not os.path.exists(pdf_path):
        raise RuntimeError("PDF conversion did not produce an output file.")
    return pdf_path
