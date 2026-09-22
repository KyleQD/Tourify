#!/usr/bin/env python3
"""Extract broadly bookable U.S. venues from the newest Overture Places release."""

from __future__ import annotations

import argparse
import json
import re
import urllib.request

import duckdb


LATEST_CATALOG = "https://stac.overturemaps.org/catalog.json"
CATEGORY_PATTERN = re.compile(
    r"(music_venue|concert_hall|night_?club|jazz_club|comedy_club|social_club|dance_hall|"
    r"theatre|theater|performing_arts|amphitheatre|amphitheater|arena|stadium|bar|banquet_hall|"
    r"convention|conference_centre|conference_center|event_venue|event_space|fairground)",
    re.IGNORECASE,
)


def latest_release() -> str:
    with urllib.request.urlopen(LATEST_CATALOG, timeout=30) as response:
        catalog = json.load(response)
    release = str(catalog.get("latest") or "").strip().strip("/").removeprefix("release/")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}(?:\.\d+)?", release):
        raise RuntimeError("The Overture STAC catalog did not return a dated latest release")
    return release


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--release", default="latest")
    parser.add_argument("--output", required=True)
    parser.add_argument("--release-output")
    args = parser.parse_args()

    release = latest_release() if args.release == "latest" else args.release
    parquet = (
        "s3://overturemaps-us-west-2/release/"
        f"{release}/theme=places/type=place/*"
    )

    connection = duckdb.connect()
    connection.execute("INSTALL spatial; LOAD spatial; INSTALL httpfs; LOAD httpfs")
    connection.execute("SET s3_region='us-west-2'")

    # Capacity and stage specifications are intentionally absent: Overture does
    # not provide trustworthy standard fields for them, so planning forms leave
    # those values blank and editable.
    connection.execute(
        f"""
        COPY (
          SELECT
            id AS overture_id,
            names.primary AS name,
            categories.primary AS primary_category,
            to_json(list_distinct(list_concat(
              coalesce(categories.alternate, []),
              CASE WHEN categories.primary IS NULL THEN [] ELSE [categories.primary] END
            ))) AS categories,
            addresses[1].freeform AS address,
            addresses[1].locality AS city,
            addresses[1].region AS state,
            addresses[1].postcode AS postal_code,
            'US' AS country,
            ST_Y(geometry) AS latitude,
            ST_X(geometry) AS longitude,
            websites[1] AS website,
            emails[1] AS email,
            phones[1] AS phone,
            operating_status,
            confidence,
            NULL::TIMESTAMPTZ AS source_updated_at
          FROM read_parquet('{parquet}', hive_partitioning=true)
          WHERE addresses[1].country IN ('US', 'USA')
            AND names.primary IS NOT NULL
            AND regexp_matches(
              lower(concat_ws(' ', categories.primary, array_to_string(categories.alternate, ' '))),
              '{CATEGORY_PATTERN.pattern}'
            )
        ) TO '{args.output}' (HEADER, DELIMITER ',', QUOTE '"', ESCAPE '"')
        """
    )

    if args.release_output:
        with open(args.release_output, "w", encoding="utf-8") as output:
            output.write(release)
    print(json.dumps({"release": release, "output": args.output}))


if __name__ == "__main__":
    main()
