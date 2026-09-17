import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
          background: "#F6F3EC",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 90, height: 90, borderRadius: 24, background: "#E4572E" }} />
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "#1B1F2A" }}>
            innaopcja<span style={{ color: "#E4572E" }}>.pl</span>
          </div>
        </div>
        <div style={{ fontSize: 28, color: "#5A5A52", marginTop: 28 }}>
          Znajdź lepszą opcję dla produktu, który Cię interesuje.
        </div>
      </div>
    ),
    { ...size }
  );
}
