"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import {
  createCustomerInline,
  type CreatedCustomer,
} from "@/app/actions/customers";
import {
  CustomerFields,
  EMPTY_CUSTOMER,
} from "@/components/customers/customer-fields";
import { Button } from "@/components/ui/button";
import { FormError, Select } from "@/components/ui/field";
import { emptyFormState, type FormState } from "@/lib/form-state";

/**
 * Customer dropdown with an "Add new customer…" entry at the top.
 *
 * Picking that entry opens a dialog holding the complete customer form. On
 * save the customer is created, appended to the list and selected — the host
 * form never loses what the user had typed. The dialog is portalled to
 * <body>, so its <form> is not nested inside the host's <form> (which HTML
 * forbids) and its inputs are never submitted along with the host's.
 *
 * Works controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
 */

export interface CustomerPickOption {
  id: string;
  label: string;
  state?: string | null;
}

const NEW_VALUE = "__new__";

export function CustomerPicker({
  id,
  name,
  customers,
  value,
  defaultValue = "",
  onChange,
  required,
  invalid,
  emptyLabel = "Select…",
  /** Pre-selects the relationship in the dialog — "VENDOR" on purchase orders. */
  newType = "LEAD",
}: {
  id: string;
  name: string;
  customers: CustomerPickOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string, customer: CustomerPickOption | undefined) => void;
  required?: boolean;
  invalid?: boolean;
  emptyLabel?: string;
  newType?: "LEAD" | "ACTIVE" | "VENDOR";
}) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;

  // Customers created here live alongside the ones the page loaded, so the
  // list stays correct even if the parent re-renders with fresh props.
  const [added, setAdded] = useState<CustomerPickOption[]>([]);
  const options = useMemo(() => {
    const known = new Set(customers.map((c) => c.id));
    return [...customers, ...added.filter((c) => !known.has(c.id))];
  }, [customers, added]);

  const [open, setOpen] = useState(false);

  const select = (next: string) => {
    if (value === undefined) setInner(next);
    onChange?.(next, options.find((c) => c.id === next));
  };

  const onCreated = (customer: CreatedCustomer) => {
    // Both updates land in the same render, so the option exists by the time
    // the select's value points at it.
    setAdded((list) => [...list, customer]);
    if (value === undefined) setInner(customer.id);
    onChange?.(customer.id, customer);
    setOpen(false);
    toast.success(`${customer.label} added and selected.`);
  };

  return (
    <>
      <Select
        id={id}
        name={name}
        value={current}
        onChange={(event) => {
          if (event.target.value === NEW_VALUE) {
            // Keep the previous selection; the dialog decides what happens.
            event.target.value = current;
            setOpen(true);
            return;
          }
          select(event.target.value);
        }}
        required={required}
        invalid={invalid}
      >
        <option value="">{emptyLabel}</option>
        <option value={NEW_VALUE}>＋ Add new customer…</option>
        {options.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.label}
          </option>
        ))}
      </Select>

      {open && (
        <NewCustomerDialog
          type={newType}
          onClose={() => setOpen(false)}
          onCreated={onCreated}
        />
      )}
    </>
  );
}

function NewCustomerDialog({
  type,
  onClose,
  onCreated,
}: {
  type: "LEAD" | "ACTIVE" | "VENDOR";
  onClose: () => void;
  onCreated: (customer: CreatedCustomer) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<FormState>(emptyFormState);
  const [pending, startTransition] = useTransition();
  const titleId = useId();

  // Only ever rendered after the user picks "Add new customer…", so this runs
  // client-side by construction — no hydration guard needed for the portal.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Plain object of every string field — what the schema expects.
    const input: Record<string, string> = {};
    for (const [key, entry] of new FormData(event.currentTarget).entries()) {
      if (typeof entry === "string") input[key] = entry;
    }

    startTransition(async () => {
      const result = await createCustomerInline(input);

      if (!result.ok) {
        setState({ error: result.error, ts: Date.now() });
        return;
      }
      if ("invalid" in result.data) {
        setState(result.data.invalid);
        return;
      }
      onCreated(result.data.customer);
    });
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="w-[min(46rem,calc(100vw/var(--ui-zoom)-2rem))] rounded-xl border border-border bg-surface p-0 text-fg shadow-overlay backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
    >
      <form
        onSubmit={submit}
        noValidate
        className="flex max-h-[calc(100dvh/var(--ui-zoom)-4rem)] flex-col"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id={titleId} className="text-[15px] font-semibold text-fg">
              Add a new customer
            </h2>
            <p className="mt-0.5 text-[13px] text-fg-muted">
              Saved to the customer list and selected here when you are done.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-4">
          <FormError>{state.error}</FormError>

          <CustomerFields
            values={{ ...EMPTY_CUSTOMER, type }}
            state={state}
            section={({ title, description, children }) => (
              <fieldset key={title} className="flex min-w-0 flex-col gap-3">
                <legend className="contents">
                  <span className="block text-[13px] font-semibold text-fg">
                    {title}
                  </span>
                  <span className="mb-1 block text-[12.5px] text-fg-muted">
                    {description}
                  </span>
                </legend>
                {children}
              </fieldset>
            )}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-3.5 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {pending ? "Saving…" : "Save and select"}
          </Button>
        </div>
      </form>
    </dialog>,
    document.body,
  );
}
