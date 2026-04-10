#!/usr/bin/env python3

import pathlib
import shutil


LOCALES = ["en-US", "es-ES", "fr-FR", "de-DE", "pt-BR", "ja-JP"]
SCREENS = ["discover", "bookings", "notifications", "profile", "auth"]


def copy_matrix(source: pathlib.Path, destination: pathlib.Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def main() -> None:
    mobile_root = pathlib.Path(__file__).resolve().parents[1]
    launch_assets = mobile_root / "assets" / "launch"
    source_ios = launch_assets / "screenshot-ios-1290x2796-v1.png"
    source_android = launch_assets / "screenshot-android-1080x2400-v1.png"

    for locale in LOCALES:
        for screen in SCREENS:
            copy_matrix(
                source_ios,
                launch_assets / "screenshots" / "ios-6_9" / locale / f"ios-6_9-{locale}-{screen}-v1.png",
            )
            copy_matrix(
                source_android,
                launch_assets
                / "screenshots"
                / "android-phone"
                / locale
                / f"android-phone-{locale}-{screen}-v1.png",
            )

    print("Prepared screenshot placeholder matrix for iOS and Android")


if __name__ == "__main__":
    main()
