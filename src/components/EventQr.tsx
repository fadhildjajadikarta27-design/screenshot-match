import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function eventUrl(slug: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/e/${slug}`;
}

export function useQrDataUrl(text: string, width = 720) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(text, { width, margin: 2, errorCorrectionLevel: "M", color: { dark: "#242424", light: "#FFFFFF" } })
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
    };
  }, [text, width]);
  return url;
}
