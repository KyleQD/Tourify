import { ImageResponse } from "next/og"

export const size = {
  width: 180,
  height: 180,
}

export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(145deg, rgb(79, 70, 229) 0%, rgb(124, 58, 237) 50%, rgb(14, 165, 233) 100%)",
          color: "white",
          fontSize: 96,
          fontWeight: 900,
          borderRadius: 34,
        }}
      >
        T
      </div>
    ),
    size
  )
}
