import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, X, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

type Props = {
  count: number;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  resolveUrl: (i: number) => Promise<string | null>;
  onDownload?: ((i: number) => void) | undefined;
  caption?: (i: number) => string;
};

export function Lightbox({ count, index, onIndex, onClose, resolveUrl, onDownload, caption }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const resolveRef = useRef(resolveUrl);
  resolveRef.current = resolveUrl;

  useEffect(() => {
    let alive = true;
    setState("loading");
    setUrl(null);
    resolveRef.current(index)
      .then((u) => {
        if (!alive) return;
        if (u) setUrl(u);
        else setState("error");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < count - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, count, onClose, onIndex]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const close = onClose;

  return (
    <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-50 flex flex-col bg-foreground">
      <div className="flex items-center justify-between p-3 text-primary-foreground">
        <span className="text-sm opacity-80">
          {index + 1} / {count}
          {caption ? ` · ${caption(index)}` : ""}
        </span>
        <div className="flex gap-1">
          {onDownload && (
            <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => onDownload(index)} aria-label="Download">
              <Download />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={close} aria-label="Close">
            <X />
          </Button>
        </div>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-4">
        {state === "loading" && <Loader2 className="absolute h-6 w-6 animate-spin text-primary-foreground/70" />}
        {state === "error" && <p className="text-sm text-primary-foreground/80">This photo couldn't be loaded.</p>}
        {url && (
          <img
            key={url}
            src={url}
            alt={`Photo ${index + 1}`}
            onLoad={() => setState("ok")}
            onError={() => setState("error")}
            className={`max-h-full max-w-full object-contain transition-opacity ${state === "ok" ? "opacity-100" : "opacity-0"}`}
          />
        )}
        {index > 0 && (
          <button onClick={() => onIndex(index - 1)} aria-label="Previous photo" className="absolute left-2 rounded-full bg-primary-foreground/10 p-3 text-primary-foreground hover:bg-primary-foreground/20">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {index < count - 1 && (
          <button onClick={() => onIndex(index + 1)} aria-label="Next photo" className="absolute right-2 rounded-full bg-primary-foreground/10 p-3 text-primary-foreground hover:bg-primary-foreground/20">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
