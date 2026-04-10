#!/usr/bin/env python3

import pathlib
import sys


REQUIRED_FILES = [
    "assets/launch/app-icon-1024-v1.png",
    "assets/launch/adaptive-foreground-1024-v1.png",
    "assets/launch/splash-image-1242x2436-v1.png",
    "docs/launch/locale-matrix.md",
    "docs/launch/asset-spec-and-registry.md",
    "docs/launch/screenshot-pipeline.md",
    "docs/launch/store-metadata-deck.md",
    "docs/launch/compliance-workbook.md",
    "docs/launch/templates/screenshot-matrix.csv",
    "docs/launch/templates/store-metadata.csv",
    "docs/launch/templates/reviewer-notes-template.md",
]


def main() -> int:
    mobile_root = pathlib.Path(__file__).resolve().parents[1]
    missing_files = [file for file in REQUIRED_FILES if not (mobile_root / file).exists()]

    if missing_files:
        print("Launch package validation failed. Missing files:")
        for file in missing_files:
            print(f"- {file}")
        return 1

    print("Launch package validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
