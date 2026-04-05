import { ImageResponse } from "next/og"

export const size = {
  width: 32,
  height: 32,
}

export const contentType = "image/png"

export default function Icon() {
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
            "linear-gradient(135deg, rgb(79, 70, 229) 0%, rgb(124, 58, 237) 55%, rgb(14, 165, 233) 100%)",
          color: "white",
          fontSize: 20,
          fontWeight: 800,
          borderRadius: 8,
        }}
      >
        T
      </div>
    ),
    size
  )
}
