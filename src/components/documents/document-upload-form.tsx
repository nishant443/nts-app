"use client";

import { useActionState, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { saveDocument } from "@/app/actions/documents";
import { CustomerPicker } from "@/components/customers/customer-picker";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";

const CATEGORIES = [
  "General",
  "Certificate",
  "Purchase bill",
  "Delivery challan",
  "ID proof",
  "Contract",
  "Report",
  "Photo",
];

/**
 * Adds a document to the library.
 *
 * The file is uploaded first, then the metadata is saved with the returned URL
 * — this keeps the Server Action a plain `FormData` submission and avoids
 * pushing a multi-megabyte body through the action serialiser.
 */
export function DocumentUploadForm({
  customers,
  employees,
  canFileForOthers,
  currentUserId,
}: {
  customers: { id: string; label: string }[];
  employees: { id: string; name: string }[];
  canFileForOthers: boolean;
  currentUserId: string;
}) {
  const [state, formAction] = useActionState(saveDocument, emptyFormState);

  const [ownerType, setOwnerType] = useState<"CUSTOMER" | "EMPLOYEE">(
    "CUSTOMER",
  );
  const [uploaded, setUploaded] = useState<{
    url: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "documents");

      const response = await fetch("/api/upload", { method: "POST", body });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "The file could not be uploaded.");
        return;
      }

      setUploaded(result);
      toast.success("File uploaded. Add the details and save.");
    } catch {
      toast.error("The file could not be uploaded. Check your connection.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title="Add a document"
          description="JPG, PNG, WEBP or PDF, up to 10 MB."
        />
        <CardBody className="flex flex-col gap-4">
          <FormBanners state={state} />

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

          {uploaded ? (
            <>
              <input type="hidden" name="url" value={uploaded.url} />
              <input type="hidden" name="mimeType" value={uploaded.mimeType} />
              <input
                type="hidden"
                name="sizeBytes"
                value={String(uploaded.sizeBytes)}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                <Field label="Belongs to" htmlFor="ownerType">
                  <Select
                    id="ownerType"
                    name="ownerType"
                    value={ownerType}
                    onChange={(event) =>
                      setOwnerType(event.target.value as "CUSTOMER" | "EMPLOYEE")
                    }
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="EMPLOYEE">Employee</option>
                  </Select>
                </Field>

                <Field
                  label={ownerType === "CUSTOMER" ? "Customer" : "Employee"}
                  htmlFor="ownerId"
                  error={fieldError(state, "ownerId")}
                >
                  {ownerType === "CUSTOMER" ? (
                    <CustomerPicker
                      id="ownerId"
                      name="ownerId"
                      customers={customers}
                      required
                      invalid={Boolean(fieldError(state, "ownerId"))}
                    />
                  ) : (
                    <Select
                      id="ownerId"
                      name="ownerId"
                      required
                      defaultValue={canFileForOthers ? "" : currentUserId}
                      invalid={Boolean(fieldError(state, "ownerId"))}
                    >
                      <option value="">Select…</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <Field label="Category" htmlFor="category">
                  <Select id="category" name="category" defaultValue="General">
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Name"
                  htmlFor="name"
                  error={fieldError(state, "name")}
                >
                  <Input
                    id="name"
                    name="name"
                    defaultValue={uploaded.name}
                    required
                  />
                </Field>

                <div className="flex gap-2">
                  <SubmitButton>Save</SubmitButton>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setUploaded(null)}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <Upload aria-hidden="true" />
                )}
                {uploading ? "Uploading…" : "Choose a file"}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </form>
  );
}
