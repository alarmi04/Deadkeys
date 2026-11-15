import { ImageResponse } from "next/og";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const c = getMessages(isLocale(lang) ? lang : "es").common;
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
          background: "linear-gradient(180deg, #5e1a1d 0%, #2a0f12 60%, #170809 100%)",
          border: "14px solid #7d6033",
          color: "#c4954a",
        }}
      >
        <div style={{ display: "flex", fontSize: 150, letterSpacing: 24, fontWeight: 700 }}>{c.siteName.toUpperCase()}</div>
        <div style={{ display: "flex", width: 220, height: 4, background: "#c4954a", margin: "28px 0" }} />
        <div style={{ display: "flex", fontSize: 44, color: "#ece3cf", letterSpacing: 3 }}>{c.tagline}</div>
        <div style={{ display: "flex", fontSize: 30, color: "#b9ad93", marginTop: 26 }}>{c.ogTagline}</div>
      </div>
    ),
    size,
  );
}
