#!/usr/bin/env python3

import pathlib
import struct
import zlib


def chunk(tag: bytes, data: bytes) -> bytes:
    checksum = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", checksum)


def generate_png(path: pathlib.Path, width: int, height: int, rgb: tuple[int, int, int]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    row = bytes(rgb) * width
    raw = b"".join(b"\x00" + row for _ in range(height))

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    idat = zlib.compress(raw, level=9)

    png_data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    path.write_bytes(png_data)


def main() -> None:
    base_path = pathlib.Path(__file__).resolve().parents[1] / "assets" / "launch"
    files = [
        ("app-icon-1024-v1.png", 1024, 1024, (15, 23, 42)),
        ("adaptive-foreground-1024-v1.png", 1024, 1024, (56, 189, 248)),
        ("splash-image-1242x2436-v1.png", 1242, 2436, (15, 23, 42)),
        ("screenshot-ios-1290x2796-v1.png", 1290, 2796, (30, 41, 59)),
        ("screenshot-android-1080x2400-v1.png", 1080, 2400, (51, 65, 85)),
    ]

    for filename, width, height, color in files:
        generate_png(base_path / filename, width, height, color)

    print(f"Generated {len(files)} placeholder assets in {base_path}")


if __name__ == "__main__":
    main()
