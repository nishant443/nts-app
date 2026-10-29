"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Download, FileText, ImageOff, X } from "lucide-react";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FileKind = "image" | "pdf";

function kindOf(url: string): FileKind {
  return /\.(?:jpe?g|png|webp)(?:$|\?)/i.test(url) ? "image" : "pdf";
}

const noop = () => () => {};

// Desktop browsers can show a PDF in a frame; Android cannot, so there the
// viewer offers a download, which opens in the phone's PDF app.
function usePdfInline(): boolean {
  return useSyncExternalStore(
    noop,
    () => navigator.pdfViewerEnabled === true,
    () => true,
  );
}

// Opens stored files and generated PDFs in a full-screen viewer inside the
// app instead of a new browser tab, so an installed app never leaves its window.
export function FilePreview({
  url,
  name,
  children,
  className,
  button,
}: {
  url: string;
  name: string;
  children: ReactNode;
  className?: string;
  button?: { variant?: ButtonVariant; size?: ButtonSize };
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const pdfInline = usePdfInline();
  const kind = kindOf(url);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal focuses the first control (Download); Close is the safer default.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const show = () => {
    setFailed(false);
    setOpen(true);
  };

  const trigger = button ? (
    <Button
      variant={button.variant ?? "secondary"}
      size={button.size}
      className={className}
      onClick={show}
    >
      {children}
    </Button>
  ) : (
    <button
      type="button"
      onClick={show}
      className={cn("cursor-pointer text-left", className)}
    >
      {children}
    </button>
  );

  return (
    <>
      {trigger}

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        aria-label={name}
        className="m-0 h-[calc(100dvh/var(--ui-zoom))] max-h-none w-[calc(100vw/var(--ui-zoom))] max-w-none overflow-hidden bg-surface p-0 text-fg backdrop:bg-black/60 sm:m-auto sm:h-[min(92dvh,calc(100dvh/var(--ui-zoom)-2rem))] sm:w-[min(68rem,calc(100vw/var(--ui-zoom)-2rem))] sm:rounded-xl sm:border sm:border-border sm:shadow-overlay"
      >
        {open && (
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-4">
              <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-fg">
                {name}
              </p>
              <Button href={url} download={downloadName(name, kind)} variant="ghost" size="sm">
                <Download aria-hidden="true" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close"
                data-autofocus
              >
                <X aria-hidden="true" />
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-surface-muted">
              {failed ? (
                <Notice icon={ImageOff} title="This file could not be opened">
                  It may have been removed, or you may not have access to it.
                </Notice>
              ) : kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- private, per-viewer file; next/image would cache it
                <img
                  src={url}
                  alt={name}
                  onError={() => setFailed(true)}
                  className="max-h-full max-w-full object-contain"
                />
              ) : pdfInline ? (
                <iframe src={url} title={name} className="size-full border-0 bg-white" />
              ) : (
                <Notice icon={FileText} title={name}>
                  <span className="block">PDFs open in your phone&apos;s PDF viewer.</span>
                  <Button
                    href={url}
                    download={downloadName(name, kind)}
                    variant="primary"
                    className="mt-4"
                  >
                    <Download aria-hidden="true" />
                    Open PDF
                  </Button>
                </Notice>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

function downloadName(name: string, kind: FileKind): string {
  const base = name.replace(/[\\/:*?"<>|]+/g, "_").trim() || "file";
  if (kind === "pdf") return /\.pdf$/i.test(base) ? base : `${base}.pdf`;
  return base;
}

function Notice({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FileText;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex max-w-sm flex-col items-center px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon aria-hidden="true" className="size-6" />
      </div>
      <p className="mt-3 text-[15px] font-semibold text-fg">{title}</p>
      <div className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">{children}</div>
    </div>
  );
}
