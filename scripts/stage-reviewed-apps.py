#!/usr/bin/env python3
"""Generate and stage Amitaba + Swastiastu only after exact owner approval.

Run from any directory. This does not commit, push, open a PR, or deploy.
Both app validators must pass before this repository's docs directory changes.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

REPOSITORY = Path(__file__).resolve().parents[1]
APPS = (("BuddhistApp", "amitaba", "Amitaba"),
        ("HinduApp", "swastiastu", "Swastiastu"))


def run(script: Path) -> None:
    subprocess.run([sys.executable, str(script)], check=True, cwd=script.parent.parent)


def check_artifact(directory: Path, app_name: str) -> dict:
    manifest = json.loads((directory / "deployment-manifest.json").read_text())
    if manifest.get("draft") is not False or manifest.get("appName") != app_name:
        raise ValueError(f"Not an approved {app_name} website: {directory}")
    if manifest.get("lessonCount") != 100 or manifest.get("languages") != ["en", "id", "hi"]:
        raise ValueError(f"Unexpected content scope: {directory}")
    expected = manifest["fileSHA256"]
    actual = {p.relative_to(directory).as_posix() for p in directory.rglob("*") if p.is_file()}
    if actual != set(expected) | {"deployment-manifest.json"}:
        raise ValueError(f"Missing or unmanifested files: {directory}")
    for relative, digest in expected.items():
        file = directory / relative
        if file.is_symlink() or not file.resolve().is_relative_to(directory.resolve()):
            raise ValueError(f"Unsafe artifact path: {relative}")
        if hashlib.sha256(file.read_bytes()).hexdigest() != digest:
            raise ValueError(f"Generated file changed: {file}")
    if len(manifest.get("pages", [])) != 316:
        raise ValueError(f"Expected 316 localized pages: {directory}")
    return manifest


def index_with_cards(original: str) -> str:
    marker = '<section class="apps" aria-label="Applications">'
    if original.count(marker) != 1:
        raise ValueError("Website app index has changed; review its insertion point manually.")
    cards = []
    for slug, name, mark, color, description in [
        ("amitaba", "Amitaba", "A", "#1a4052", "100 Dhammapada lessons and Eightfold Path reflection in English, Bahasa Indonesia, and Hindi. Membership information, privacy, and support."),
        ("swastiastu", "Swastiastu", "S", "#5c2952", "100 Bhagavad Gita lessons and everyday reflection in English, Bahasa Indonesia, and Hindi. Membership information, privacy, and support."),
    ]:
        if f'href="{slug}/"' in original:
            continue
        cards.append(f'''      <a class="card" href="{slug}/">
        <span class="mark" aria-hidden="true" style="background:{color};color:#fff">{mark}</span>
        <h2>{name}</h2>
        <p>{description}</p>
      </a>''')
    return original.replace(marker, marker + ("\n" + "\n".join(cards) if cards else ""), 1)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", type=Path, default=REPOSITORY.parent)
    parser.add_argument("--stage", action="store_true", help="Copy verified approved outputs into docs. Without this, only generate and check.")
    args = parser.parse_args()
    prepared = []
    for folder, slug, name in APPS:
        root = (args.workspace / folder).resolve()
        # No --draft flag is accepted here: generation performs release validation.
        run(root / "scripts/generate_website.py")
        run(root / "scripts/verify_website.py")
        output = root / "build/Website" / slug
        check_artifact(output, name)
        prepared.append((root, output, slug, name))
    if not args.stage:
        print("Both approved websites verified. Run again with --stage to copy into docs.")
        return

    docs = REPOSITORY / "docs"
    if docs.is_symlink():
        raise ValueError("Refusing symbolic-link docs directory")
    index = docs / "index.html"
    updated_index = index_with_cards(index.read_text())
    for _, _, slug, name in prepared:
        destination = docs / slug
        if destination.is_symlink():
            raise ValueError(f"Refusing symbolic-link destination: {destination}")
        if destination.exists():
            check_artifact(destination, name)
    # Prepare both sites before replacing any public directory; retain a rollback
    # copy of existing managed sites until both moves and the index write finish.
    with tempfile.TemporaryDirectory(prefix=".reviewed-sites-", dir=REPOSITORY) as temporary:
        temporary = Path(temporary)
        for _, output, slug, name in prepared:
            shutil.copytree(output, temporary / slug)
            check_artifact(temporary / slug, name)
        changed, backups = [], []
        try:
            for _, _, slug, _ in prepared:
                destination = docs / slug
                if destination.exists():
                    backup = temporary / (slug + ".previous")
                    os.replace(destination, backup)
                    backups.append((backup, destination))
                os.replace(temporary / slug, destination)
                changed.append(destination)
            pending_index = temporary / "index.html"
            pending_index.write_text(updated_index)
            os.replace(pending_index, index)
        except Exception:
            for destination in changed:
                shutil.rmtree(destination)
            for backup, destination in backups:
                os.replace(backup, destination)
            raise
    print("Staged 632 approved localized pages plus assets and app-index links. Review git diff before committing.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        raise SystemExit(f"No publication performed: {error}")
