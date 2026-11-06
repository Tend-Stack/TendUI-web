#!/usr/bin/env python3
"""Vendor a clean GothUI checkout without registry credentials in the image.

Uses Go's ordinary module-proxy and vendoring mechanisms. The temporary proxy
and module cache are removed automatically. Runtime builds require only Go.
Usage: python3 tools/vendor-library.py /path/to/GothUI
"""
import datetime
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import zipfile

source = Path(sys.argv[1]).resolve()
root = Path(__file__).resolve().parents[1]
go = os.environ.get("GO", "go")
module = "github.com/Tend-Stack/GothUI/v2026"

def git(*args):
    return subprocess.check_output(["git", "-C", str(source), *args])

if git("status", "--porcelain").strip():
    raise SystemExit("Commit library changes before recording its dependency.")
revision = git("rev-parse", "HEAD").decode().strip()
stamp = datetime.datetime.fromtimestamp(int(git("show", "-s", "--format=%ct", "HEAD")), datetime.timezone.utc)
tags = git("tag", "--points-at", "HEAD").decode().splitlines()
release = next((tag for tag in tags if tag.startswith("v2026.") and "-" not in tag), None)
version = release or "v2026.0.0-" + stamp.strftime("%Y%m%d%H%M%S") + "-" + revision[:12]
escaped = "".join("!" + c.lower() if c.isupper() else c for c in module)
shared_cache = Path(subprocess.check_output([go, "env", "GOMODCACHE"], text=True).strip())

with tempfile.TemporaryDirectory(prefix="gothui-vendor-") as temp:
    temporary = Path(temp)
    proxy = temporary / "proxy"
    entry = proxy / escaped / "@v"
    entry.mkdir(parents=True)
    (entry / (version + ".mod")).write_bytes(git("show", "HEAD:go.mod"))
    (entry / (version + ".info")).write_text(json.dumps({"Version": version, "Time": stamp.isoformat().replace("+00:00", "Z")}))
    (entry / "list").write_text(version + "\n")
    archive = git("archive", "--format=tar", "HEAD")
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar, zipfile.ZipFile(entry / (version + ".zip"), "w", zipfile.ZIP_DEFLATED) as zipped:
        for member in tar.getmembers():
            if member.isfile():
                zipped.writestr(module + "@" + version + "/" + member.name, tar.extractfile(member).read())
    env = dict(os.environ, GOMODCACHE=str(temporary / "modules"), GOPROXY=proxy.as_uri() + "," + (shared_cache / "cache/download").as_uri(), GONOSUMDB=module, GOPRIVATE="", GOWORK="off", GOFLAGS="-mod=mod")
    for args in [
        ["mod", "edit", "-dropreplace=" + module, "-require=" + module + "@" + version],
        ["mod", "tidy"],
        ["mod", "vendor"],
    ]:
        subprocess.run([go, *args], cwd=root, env=env, check=True)
    (root / "library-version.json").write_text(json.dumps({"module": module, "version": version, "commit": revision}, indent=2) + "\n")
    print("Vendored GothUI " + version + " from clean commit " + revision[:12])
