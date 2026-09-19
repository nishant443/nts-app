"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { formatCurrency } from "@/lib/money";
import { computeTotals } from "@/lib/tax";
import { cn } from "@/lib/utils";

export interface LineItemValue {
  description: string;
  hsnCode: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  taxRate: string;
}

export const EMPTY_LINE: LineItemValue = {
  description: "",
  hsnCode: "",
  quantity: "1",
  unit: "Nos",
  unitPrice: "",
  taxRate: "18",
};

const UNITS = ["Nos", "Job", "Visit", "Set", "Hour", "Day", "Kg", "Mtr", "Lot"];
const TAX_RATES = ["0", "5", "12", "18", "28"];

export function LineItemsEditor({
  initialItems,
  placeOfSupply,
  homeState,
  discountName = "discountAmount",
  initialDiscount = "0",
  showDiscount = true,
}: {
  initialItems: LineItemValue[];
  placeOfSupply: string;
  homeState: string;
  discountName?: string;
  initialDiscount?: string;
  showDiscount?: boolean;
}) {
  const [rows, setRows] = useState<LineItemValue[]>(
    initialItems.length > 0 ? initialItems : [{ ...EMPTY_LINE }],
  );
  const [discount, setDiscount] = useState(initialDiscount);

  const update = (index: number, patch: Partial<LineItemValue>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addRow = () => setRows((current) => [...current, { ...EMPTY_LINE }]);

  const removeRow = (index: number) => {
    setRows((current) =>
      current.length === 1
        ? [{ ...EMPTY_LINE }]
        : current.filter((_, i) => i !== index),
    );
  };

  const totals = useMemo(
    () =>
      computeTotals({
        lines: rows.map((row) => ({
          quantity: Number(row.quantity) || 0,
          unitPrice: Number(row.unitPrice) || 0,
          taxRate: Number(row.taxRate) || 0,
        })),
        discountAmount: Number(discount) || 0,
        placeOfSupply,
        homeState,
      }),
    [rows, discount, placeOfSupply, homeState],
  );

  const intraState = totals.igstAmount === 0;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col divide-y divide-border">
        <div className="hidden items-center gap-3 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle lg:flex sm:px-5">
          <span className="flex-1">Description</span>
          <span className="w-20 shrink-0">HSN/SAC</span>
          <span className="w-20 shrink-0 text-right">Qty</span>
          <span className="w-24 shrink-0">Unit</span>
          <span className="w-28 shrink-0 text-right">Rate</span>
          <span className="w-20 shrink-0 text-right">Tax %</span>
          <span className="w-28 shrink-0 text-right">Amount</span>
          <span className="w-8 shrink-0" />
        </div>

        {rows.map((row, index) => {
          const amount =
            (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);

          return (
            <div
              key={index}
              className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:gap-3 lg:py-3"
            >
              <div className="min-w-0 flex-1">
                <MobileLabel>Description</MobileLabel>
                <Input
                  name="item.description"
                  value={row.description}
                  onChange={(event) =>
                    update(index, { description: event.target.value })
                  }
                  placeholder="Spindle rebuild and dynamic balancing"
                  aria-label={`Line ${index + 1} description`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 lg:contents">
                <div className="lg:w-20 lg:shrink-0">
                  <MobileLabel>HSN/SAC</MobileLabel>
                  <Input
                    name="item.hsnCode"
                    value={row.hsnCode}
                    onChange={(event) =>
                      update(index, { hsnCode: event.target.value })
                    }
                    className="font-mono text-[13px]"
                    aria-label={`Line ${index + 1} HSN code`}
                  />
                </div>

                <div className="lg:w-20 lg:shrink-0">
                  <MobileLabel>Quantity</MobileLabel>
                  <Input
                    name="item.quantity"
                    value={row.quantity}
                    onChange={(event) =>
                      update(index, { quantity: event.target.value })
                    }
                    inputMode="decimal"
                    className="tnum text-right"
                    aria-label={`Line ${index + 1} quantity`}
                  />
                </div>

                <div className="lg:w-24 lg:shrink-0">
                  <MobileLabel>Unit</MobileLabel>
                  <Select
                    name="item.unit"
                    value={row.unit}
                    onChange={(event) =>
                      update(index, { unit: event.target.value })
                    }
                    aria-label={`Line ${index + 1} unit`}
                  >
                    {UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="lg:w-28 lg:shrink-0">
                  <MobileLabel>Rate</MobileLabel>
                  <Input
                    name="item.unitPrice"
                    value={row.unitPrice}
                    onChange={(event) =>
                      update(index, { unitPrice: event.target.value })
                    }
                    inputMode="decimal"
                    placeholder="0.00"
                    className="tnum text-right"
                    aria-label={`Line ${index + 1} rate`}
                  />
                </div>

                <div className="lg:w-20 lg:shrink-0">
                  <MobileLabel>Tax %</MobileLabel>
                  <Select
                    name="item.taxRate"
                    value={row.taxRate}
                    onChange={(event) =>
                      update(index, { taxRate: event.target.value })
                    }
                    aria-label={`Line ${index + 1} tax rate`}
                  >
                    {TAX_RATES.map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}%
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 lg:contents">
                <span className="text-[12px] font-medium uppercase tracking-wide text-fg-subtle lg:hidden">
                  Amount
                </span>
                <span className="tnum shrink-0 text-[14px] font-semibold text-fg lg:w-28 lg:pt-2 lg:text-right">
                  {formatCurrency(amount)}
                </span>

                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  aria-label={`Remove line ${index + 1}`}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger lg:mt-1"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border px-4 py-3 sm:px-5">
        <Button type="button" variant="secondary" size="sm" onClick={addRow}>
          <Plus aria-hidden="true" />
          Add line
        </Button>
      </div>

      <div className="border-t border-border bg-surface-muted px-4 py-4 sm:px-5">
        <div className="ml-auto flex w-full max-w-sm flex-col gap-2">
          <TotalRow label="Subtotal" value={totals.subtotal} />

          {showDiscount && (
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor={discountName}
                className="text-[13px] text-fg-muted"
              >
                Discount
              </label>
              <Input
                id={discountName}
                name={discountName}
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
                inputMode="decimal"
                className="tnum h-8 w-32 text-right"
              />
            </div>
          )}

          {totals.discountAmount > 0 && (
            <TotalRow
              label="Taxable value"
              value={totals.taxableAmount}
            />
          )}

          {intraState ? (
            <>
              <TotalRow label="CGST" value={totals.cgstAmount} muted />
              <TotalRow label="SGST" value={totals.sgstAmount} muted />
            </>
          ) : (
            <TotalRow label="IGST" value={totals.igstAmount} muted />
          )}

          <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2.5">
            <span className="text-[14px] font-semibold text-fg">Total</span>
            <span className="tnum text-[17px] font-semibold text-fg">
              {formatCurrency(totals.total)}
            </span>
          </div>

          <p className="text-[11.5px] leading-relaxed text-fg-subtle">
            {intraState
              ? "Intra-state supply — CGST + SGST applied."
              : "Inter-state supply — IGST applied."}{" "}
            Final figures are recalculated on save.
          </p>
        </div>
      </div>
    </div>
  );
}

function MobileLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[12px] font-medium text-fg-muted lg:hidden">
      {children}
    </span>
  );
}

function TotalRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-[13px]", muted ? "text-fg-subtle" : "text-fg-muted")}>
        {label}
      </span>
      <span className="tnum text-[13.5px] font-medium text-fg">
        {formatCurrency(value)}
      </span>
    </div>
  );
}
