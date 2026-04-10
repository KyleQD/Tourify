#!/usr/bin/env python3

import pathlib
import struct
import sys


EXPECTED_DIMENSIONS = {
    "assets/launch/app-icon-1024-v1.png": (1024, 1024),
    "assets/launch/adaptive-foreground-1024-v1.png": (1024, 1024),
    "assets/launch/splash-image-1242x2436-v1.png": (1242, 2436),
    "assets/launch/screenshot-ios-1290x2796-v1.png": (1290, 2796),
    "assets/launch/screenshot-android-1080x2400-v1.png": (1080, 2400),
}


def read_png_dimensions(path: pathlib.Path) -> tuple[int, int]:
    data = path.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError(f"Not a PNG: {path}")

    if data[12:16] != b"IHDR":
        raise ValueError(f"Invalid PNG IHDR: {path}")

    width = struct.unpack(">I", data[16:20])[0]
    height = struct.unpack(">I", data[20:24])[0]
    return (width, height)


def main() -> int:
    mobile_root = pathlib.Path(__file__).resolve().parents[1]
    errors: list[str] = []

    for relative_path, expected_size in EXPECTED_DIMENSIONS.items():
        file_path = mobile_root / relative_path
        if not file_path.exists():
            errors.append(f"Missing file: {relative_path}")
            continue

        try:
            actual_size = read_png_dimensions(file_path)
        except ValueError as error:
            errors.append(str(error))
            continue

        if actual_size != expected_size:
            errors.append(
                f"Invalid size for {relative_path}: expected {expected_size[0]}x{expected_size[1]}, got {actual_size[0]}x{actual_size[1]}"
            )

    if errors:
        print("Launch image dimension check failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Launch image dimension check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
