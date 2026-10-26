// Browser-only image helpers: compress originals and generate thumbnails.

export type Prepared = { file: Blob; thumb: Blob | null; width: number; height: number; name: string };

const MAX_EDGE = 3200;
const THUMB_EDGE = 480;
const COMPRESS_OVER = 2.5 * 1024 * 1024;

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    } catch {
      /* fall through */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function draw(src: ImageBitmap | HTMLImageElement, w: number, h: number, edge: number, type: string, q: number) {
  const scale = Math.min(1, edge / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(src, 0, 0, cw, ch);
  return new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), type, q));
}

export async function prepareImage(file: File): Promise<Prepared> {
  const src = await decode(file);
  const width = "naturalWidth" in src ? src.naturalWidth : src.width;
  const height = "naturalHeight" in src ? src.naturalHeight : src.height;
  let out: Blob = file;
  if (file.size > COMPRESS_OVER || Math.max(width, height) > MAX_EDGE) {
    const c = await draw(src, width, height, MAX_EDGE, "image/jpeg", 0.86);
    if (c && c.size < file.size) out = c;
  }
  let thumb = await draw(src, width, height, THUMB_EDGE, "image/webp", 0.75);
  if (thumb && thumb.type !== "image/webp") thumb = await draw(src, width, height, THUMB_EDGE, "image/jpeg", 0.75);
  if ("close" in src) src.close();
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const isResized = out !== file;
  return {
    file: out,
    thumb,
    width: isResized ? Math.round(width * scale) : width,
    height: isResized ? Math.round(height * scale) : height,
    name: file.name,
  };
}

export function guestId(): string {
  const k = "velora_guest";
  let v = localStorage.getItem(k);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(k, v);
  }
  return v;
}
