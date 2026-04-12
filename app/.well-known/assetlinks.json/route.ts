import { NextResponse } from "next/server"

const androidPackageName = "com.tourify.mobile"

function getSha256Fingerprints() {
  const raw = process.env.ANDROID_APP_SHA256_CERT_FINGERPRINTS || ""
  return raw
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
}

export function GET() {
  const sha256Fingerprints = getSha256Fingerprints()
  if (!sha256Fingerprints.length)
    return NextResponse.json([], {
      headers: {
        "cache-control": "public, max-age=300",
      },
    })

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: androidPackageName,
          sha256_cert_fingerprints: sha256Fingerprints,
        },
      },
    ],
    {
      headers: {
        "cache-control": "public, max-age=3600",
      },
    }
  )
}
