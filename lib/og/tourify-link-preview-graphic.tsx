import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

/** 1200×630 — optimal for iMessage, Slack, X/Twitter, and most social cards */
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

/** File is PNG image data despite `.jpg` extension (see `file` on asset). */
const LOGO_FILE = "tourify-logo-white-email.jpg"

/** Source asset is 4500×2000 — keep aspect; sized to fit 630px-tall cards without clipping */
const LOGO_DISPLAY = { width: 760, height: 338 }

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
          padding: "40px 48px 44px",
          position: "relative",
          color: "white",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          background: [
            "radial-gradient(ellipse 95% 65% at 50% -8%, rgba(129, 140, 248, 0.55), transparent 58%)",
            "radial-gradient(circle at 12% 88%, rgba(14, 165, 233, 0.35), transparent 42%)",
            "radial-gradient(circle at 92% 72%, rgba(236, 72, 153, 0.28), transparent 38%)",
            "linear-gradient(155deg, rgb(2, 6, 23) 0%, rgb(30, 27, 75) 42%, rgb(15, 23, 42) 100%)",
          ].join(", "),
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.14,
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 22,
            maxWidth: 1080,
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <img
              src={logoSrc}
              alt="Tourify"
              width={LOGO_DISPLAY.width}
              height={LOGO_DISPLAY.height}
              style={{
                objectFit: "contain",
                filter: "drop-shadow(0 22px 60px rgba(79, 70, 229, 0.45))",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "rgba(224, 231, 255, 0.92)",
                }}
              >
                Connect · Create · Tour
              </span>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                {["Artists", "Venues", "Promoters", "Crew"].map((label) => (
                  <span
                    key={label}
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.22)",
                      background: "rgba(15, 23, 42, 0.35)",
                      color: "rgba(226, 232, 240, 0.95)",
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
            gap: 12,
          }}
        >
            <div
              style={{
                fontSize: 40,
                lineHeight: 1.12,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                textShadow: "0 10px 40px rgba(0,0,0,0.35)",
              }}
            >
              The live platform for people who make shows happen.
            </div>
            <div
              style={{
                fontSize: 23,
                lineHeight: 1.38,
                fontWeight: 600,
                color: "rgba(226, 232, 240, 0.94)",
                maxWidth: 1020,
              }}
            >
              Showcase your work, book gigs, coordinate logistics, and keep your crew aligned — from
              first pitch to encore.
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 48,
            right: 48,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 16,
            fontWeight: 700,
            color: "rgba(226, 232, 240, 0.78)",
            zIndex: 1,
          }}
        >
          <span>tourify.live</span>
          <span>Open the link to join the network</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
