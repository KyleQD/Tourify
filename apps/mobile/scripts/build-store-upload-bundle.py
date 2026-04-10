#!/usr/bin/env python3

import csv
import pathlib
import shutil
import sys


LOCALES = ["en-US", "es-ES", "fr-FR", "de-DE", "pt-BR", "ja-JP"]
SCREENS = ["discover", "bookings", "notifications", "profile", "auth"]


def ensure_directory(path: pathlib.Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def copy_if_exists(source: pathlib.Path, destination: pathlib.Path) -> None:
    if not source.exists():
        raise FileNotFoundError(f"Missing required asset: {source}")

    ensure_directory(destination.parent)
    shutil.copy2(source, destination)


def write_locale_metadata(source_csv: pathlib.Path, locale: str, destination_csv: pathlib.Path) -> None:
    with source_csv.open(newline="", encoding="utf-8") as input_file:
        reader = csv.DictReader(input_file)
        rows = [row for row in reader if row["locale"] == locale]

    if not rows:
        raise ValueError(f"Missing metadata row for locale: {locale}")

    with destination_csv.open("w", newline="", encoding="utf-8") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)


def build_bundle() -> None:
    mobile_root = pathlib.Path(__file__).resolve().parents[1]
    source_root = mobile_root / "assets" / "launch"
    metadata_csv = mobile_root / "docs" / "launch" / "templates" / "store-metadata.csv"
    output_root = mobile_root / "dist" / "store-upload-bundle"

    if output_root.exists():
        shutil.rmtree(output_root)

    ensure_directory(output_root)
    copy_if_exists(metadata_csv, output_root / "store-metadata-all-locales.csv")

    for locale in LOCALES:
        locale_root = output_root / locale
        ensure_directory(locale_root)

        write_locale_metadata(metadata_csv, locale, locale_root / "store-metadata.csv")

        copy_if_exists(
            source_root / "app-icon-1024-v1.png",
            locale_root / "common" / "app-icon-1024-v1.png",
        )
        copy_if_exists(
            source_root / "splash-image-1242x2436-v1.png",
            locale_root / "common" / "splash-image-1242x2436-v1.png",
        )
        copy_if_exists(
            source_root / "adaptive-foreground-1024-v1.png",
            locale_root / "android" / "adaptive-foreground-1024-v1.png",
        )

        for screen in SCREENS:
            copy_if_exists(
                source_root / "screenshots" / "ios-6_9" / locale / f"ios-6_9-{locale}-{screen}-v1.png",
                locale_root / "ios" / f"ios-6_9-{locale}-{screen}-v1.png",
            )
            copy_if_exists(
                source_root
                / "screenshots"
                / "android-phone"
                / locale
                / f"android-phone-{locale}-{screen}-v1.png",
                locale_root / "android" / f"android-phone-{locale}-{screen}-v1.png",
            )


def main() -> int:
    try:
        build_bundle()
    except (FileNotFoundError, ValueError) as error:
        print(f"Store upload bundle generation failed: {error}")
        return 1

    print("Store upload bundle generated at apps/mobile/dist/store-upload-bundle")
    return 0


if __name__ == "__main__":
    sys.exit(main())
