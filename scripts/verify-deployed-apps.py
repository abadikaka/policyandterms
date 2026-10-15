#!/usr/bin/env python3
"""Verify deployed manifests, every localized route, and representative bytes.

Read-only public HTTP checks. Run after the website pull request is merged and
GitHub Pages has deployed. A green local build does not establish live readiness.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import urllib.request

REPOSITORY = Path(__file__).resolve().parents[1]
BASE = "https://michaelabadi.com/policyandterms"


def request(url: str, method: str = "GET"):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": "AppReleaseLinkCheck/1.0", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=30) as response:
        if response.status != 200 or not response.url.startswith(BASE + "/"):
            raise ValueError(f"Unexpected response: {url} -> {response.status} {response.url}")
        return response.read() if method == "GET" else None


def check_one(item):
    url, method, digest = item
    try:
        body = request(url, method)
        if digest and hashlib.sha256(body).hexdigest() != digest:
            return f"Live content differs: {url}"
    except Exception as error:
        return f"{url}: {error}"
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="Optional local JSON evidence path")
    args = parser.parse_args()
    jobs = []
    evidence = {"baseURL": BASE, "sites": [], "errors": []}
    for slug in ("amitaba", "swastiastu"):
        root = REPOSITORY / "docs" / slug
        expected_bytes = (root / "deployment-manifest.json").read_bytes()
        manifest = json.loads(expected_bytes)
        if manifest.get("draft") is not False:
            raise ValueError(f"Refusing to verify draft for publication: {slug}")
        live_manifest = request(f"{BASE}/{slug}/deployment-manifest.json")
        if live_manifest != expected_bytes:
            raise ValueError(f"The latest approved deployment manifest is not live: {slug}")
        hashes = manifest["fileSHA256"]
        # All pages and assets must exist. Read exact bytes for every legal page,
        # three lesson samples in each language, and the shared JS/CSS/icon.
        samples = {p for p in hashes if p in {"index.html", "assets/challenge.js", "assets/site.css", "assets/icon.png"} or (p.endswith("index.html") and "/stories/" not in p)}
        for language in ("en", "id", "hi"):
            stories = sorted(p for p in hashes if p.startswith(language + "/stories/"))
            samples.update(stories[::max(1, len(stories)//3)][:3])
        for relative, digest in hashes.items():
            exact = relative in samples
            jobs.append((f"{BASE}/{slug}/{relative}", "GET" if exact else "HEAD", digest if exact else None))
        evidence["sites"].append({"slug": slug, "pages": len(manifest["pages"]), "files": len(hashes), "exactByteSamples": len(samples), "manifestSHA256": hashlib.sha256(expected_bytes).hexdigest()})
    with ThreadPoolExecutor(max_workers=6) as pool:
        evidence["errors"] = [error for error in pool.map(check_one, jobs) if error]
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(evidence, indent=2) + "\n")
    for site in evidence["sites"]:
        print(f'{site["slug"]}: {site["pages"]} routes; {site["files"]} files; {site["exactByteSamples"]} exact-byte samples')
    if evidence["errors"]:
        raise SystemExit("\n".join(evidence["errors"]))
    print("Both approved deployment manifests and every public route are live.")


if __name__ == "__main__":
    main()
