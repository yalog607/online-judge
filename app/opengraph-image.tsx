import { ImageResponse } from "next/og";

export const alt = "ITOJ - Online Judge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "linear-gradient(135deg, #2e1065 0%, #5b21b6 100%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 120,
              height: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
              color: "#5b21b6",
              fontSize: 64,
              fontWeight: 700,
              borderRadius: 28,
            }}
          >
            IT
          </div>
          <div style={{ fontSize: 112, fontWeight: 700, marginLeft: 36, letterSpacing: -3 }}>
            ITOJ
          </div>
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, marginTop: 56 }}>Online Judge</div>
        <div style={{ fontSize: 34, marginTop: 20, opacity: 0.85 }}>
          Luyện tập và chấm bài lập trình trực tuyến cho lớp học và kỳ thi
        </div>
      </div>
    ),
    size,
  );
}
