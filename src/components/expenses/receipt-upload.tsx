"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Attaches a receipt.
 *
 * The file is uploaded on selection and the resulting URL is carried by a
 * hidden input, so the expense form itself stays a plain `FormData` submission
 * and never has to handle multipart encoding.
 */
export function ReceiptUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "receipts");

      const response = await fetch("/api/upload", { method: "POST", body });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "The receipt could not be uploaded.");
        return;
      }

      onChange(result.url);
      toast.success("Receipt attached.");
    } catch {
      toast.error("The receipt could not be uploaded. Check your connection.");
    } finally {
      setUploading(false);
      // Allow re-selecting the same file after a failure.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-fg-muted">Receipt</span>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 py-2.5">
          <FileText aria-hidden="true" className="size-4 shrink-0 text-accent" />
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-[13px] font-medium text-accent hover:underline"
          >
            View attached receipt
          </a>
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Remove receipt"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : (
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Paperclip aria-hidden="true" />
            )}
            {uploading ? "Uploading…" : "Attach receipt"}
          </Button>
          <p className="mt-1.5 text-xs text-fg-subtle">
            JPG, PNG, WEBP or PDF, up to 10 MB.
          </p>
        </div>
      )}
    </div>
  );
}
