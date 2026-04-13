#!/usr/bin/env python3
"""Migrate @supabase/auth-helpers-nextjs to @/lib/supabase/client | server."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_PARTS = frozenset({"node_modules", ".next", "apps", "supabase"})


def skip_path(p: Path) -> bool:
    return any(part in SKIP_PARTS for part in p.parts)


def add_client_import(text: str) -> str:
    if re.search(r"from [\"']@/lib/supabase/client[\"']", text):
        return text
    line = "import { supabase } from '@/lib/supabase/client'\n"
    if text.startswith('"use client"') or text.startswith("'use client'"):
        parts = text.splitlines(keepends=True)
        out: list[str] = []
        i = 0
        if parts:
            out.append(parts[0])
            i = 1
            if i < len(parts) and parts[i].strip() == "":
                out.append(parts[i])
                i += 1
        return "".join(out + [line] + parts[i:])
    return line + text


def strip_client_component_client(text: str) -> str:
    if "createClientComponentClient" not in text:
        return text
    text = re.sub(
        r"^import \{ createClientComponentClient \} from [\"']@supabase/auth-helpers-nextjs[\"'];?\s*\n",
        "",
        text,
        flags=re.M,
    )
    text = re.sub(
        r"^import type \{ Database \} from [\"']@/lib/database.types[\"'];?\s*\n",
        "",
        text,
        flags=re.M,
    )
    text = re.sub(
        r"^\s*const supabase = createClientComponentClient(?:<Database>)?\(\)\s*\n",
        "",
        text,
        flags=re.M,
    )
    if "private supabase = createClientComponentClient" in text:
        text = text.replace(
            "private supabase = createClientComponentClient<Database>()",
            "private readonly supabase = supabase",
        )
        text = text.replace(
            "private supabase = createClientComponentClient()",
            "private readonly supabase = supabase",
        )
        text = add_client_import(text)
    if re.search(r"\bsupabase\.", text) and "createClientComponentClient" not in text:
        if not re.search(r"from [\"']@/lib/supabase/client[\"']", text):
            text = add_client_import(text)
    return text


def ensure_server_import(text: str) -> str:
    if re.search(r"from [\"']@/lib/supabase/server[\"']", text):
        return text
    return "import { createClient } from '@/lib/supabase/server'\n" + text


def migrate_route_handler(text: str) -> str:
    if "createRouteHandlerClient" not in text:
        return text
    text = re.sub(
        r"^import \{ createRouteHandlerClient \} from [\"']@supabase/auth-helpers-nextjs[\"'];?\s*\n",
        "",
        text,
        flags=re.M,
    )
    text = ensure_server_import(text)

    # const cookieStore = cookies() / await cookies()
    text = re.sub(
        r"const cookieStore = (?:await )?cookies\(\)\s*\n\s*const supabase = createRouteHandlerClient\(\{ cookies:\s*\(\)\s*=>\s*cookieStore\s*\}\)\s*\n",
        "const supabase = await createClient()\n",
        text,
    )
    text = re.sub(
        r"const supabase = createRouteHandlerClient\(\{ cookies \}\)\s*\n",
        "const supabase = await createClient()\n",
        text,
    )
    text = re.sub(
        r"const supabase = createRouteHandlerClient\(\{\s*cookies\s*\}\)\s*\n",
        "const supabase = await createClient()\n",
        text,
    )

    if "cookies(" not in text:
        text = re.sub(r"^import \{ cookies \} from [\"']next/headers[\"'];?\s*\n", "", text, flags=re.M)
    return text


def migrate_server_component(text: str) -> str:
    if "createServerComponentClient" not in text:
        return text
    text = re.sub(
        r"^import \{ createServerComponentClient \} from [\"']@supabase/auth-helpers-nextjs[\"'];?\s*\n",
        "",
        text,
        flags=re.M,
    )
    text = ensure_server_import(text)
    text = re.sub(
        r"^import \{ cookies \} from [\"']next/headers[\"'];?\s*\n",
        "",
        text,
        flags=re.M,
    )
    text = re.sub(
        r"const supabase = createServerComponentClient\(\{ cookies \}\)\s*\n",
        "const supabase = await createClient()\n",
        text,
    )
    return text


def process_file(path: Path) -> bool:
    raw = path.read_text(encoding="utf-8")
    text = raw
    text = strip_client_component_client(text)
    text = migrate_route_handler(text)
    text = migrate_server_component(text)
    if text != raw:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> int:
    n = 0
    for p in list(ROOT.rglob("*.ts")) + list(ROOT.rglob("*.tsx")):
        if skip_path(p):
            continue
        if process_file(p):
            n += 1
    print(f"updated {n} files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
