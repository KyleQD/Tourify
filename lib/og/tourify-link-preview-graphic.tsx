import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

/** 1200x630: optimal for iMessage, Slack, X/Twitter, and most social cards. */
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

/** File is PNG image data despite `.jpg` extension (see `file` on asset). */
const LOGO_FILE = "tourify-logo-white-email.jpg"

/** Source asset is 4500x2000. Keep aspect and center it as the full card focus. */
const LOGO_DISPLAY = { width: 920, height: 409 }

export default async function TourifyLinkPreviewGraphic() {
  const logoPath = join(process.cwd(), "public", LOGO_FILE)
  const logoBytes = await readFile(logoPath)
  const logoSrc = `data:image/png;base64,${logoBytes.toString("base64")}`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px 64px 48px",
          position: "relative",
          overflow: "hidden",
          color: "white",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          background: [
            "linear-gradient(115deg, rgba(56, 189, 248, 0.18) 0%, transparent 34%)",
            "linear-gradient(245deg, rgba(217, 70, 239, 0.18) 0%, transparent 38%)",
            "linear-gradient(180deg, rgba(15, 23, 42, 0.18) 0%, rgba(2, 6, 23, 0.72) 100%)",
            "linear-gradient(145deg, rgb(3, 7, 18) 0%, rgb(15, 23, 42) 52%, rgb(6, 11, 27) 100%)",
          ].join(", "),
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.18,
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 32,
            borderRadius: 42,
            border: "1px solid rgba(255,255,255,0.13)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.16), 0 34px 100px rgba(0,0,0,0.42)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))",
          }}
        />

        <div
          style={{
            position: "absolute",
            width: 900,
            height: 300,
            top: 72,
            left: 150,
            opacity: 0.38,
            filter: "blur(46px)",
            background:
              "linear-gradient(90deg, rgba(34, 211, 238, 0.28), rgba(168, 85, 247, 0.32), rgba(244, 114, 182, 0.18))",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            maxWidth: 1040,
          }}
        >
          <img
            src={logoSrc}
            alt="Tourify"
            width={LOGO_DISPLAY.width}
            height={LOGO_DISPLAY.height}
            style={{
              objectFit: "contain",
              filter: "drop-shadow(0 28px 72px rgba(56, 189, 248, 0.24))",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  )
}
