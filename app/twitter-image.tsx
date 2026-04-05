import { ImageResponse } from "next/og"

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background:
            "radial-gradient(circle at 15% 15%, rgba(14,165,233,0.35), transparent 35%), radial-gradient(circle at 88% 20%, rgba(124,58,237,0.35), transparent 32%), linear-gradient(140deg, rgb(2,6,23) 0%, rgb(30,27,75) 52%, rgb(15,23,42) 100%)",
          color: "white",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 42,
              fontWeight: 900,
              background:
                "linear-gradient(135deg, rgb(79, 70, 229) 0%, rgb(124, 58, 237) 55%, rgb(14, 165, 233) 100%)",
              boxShadow: "0 16px 48px rgba(79, 70, 229, 0.35)",
            }}
          >
            T
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.1 }}>Tourify</span>
            <span style={{ fontSize: 20, color: "rgba(226, 232, 240, 0.95)" }}>Connect. Create. Tour.</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
          <div style={{ fontSize: 56, lineHeight: 1.08, fontWeight: 800 }}>
            Build your profile and unlock live opportunities
          </div>
          <div style={{ fontSize: 28, color: "rgba(203, 213, 225, 0.95)" }}>
            Discover events, connect with venues, and grow your music network in one place.
          </div>
        </div>
      </div>
    ),
    size
  )
}
