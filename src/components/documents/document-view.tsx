import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatAddress, type CompanyProfile } from "@/lib/settings";
import { amountInWords, formatAmount, formatCurrency } from "@/lib/money";

/**
 * On-screen rendering of a quotation, invoice or purchase order.
 *
 * Mirrors the PDF layout so what people review here is what the customer
 * receives. The line-item table scrolls inside its own container on narrow
 * screens rather than widening the page.
 */

export interface DocumentLine {
  id: string;
  description: string;
  hsnCode: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

export interface DocumentParty {
  name: string;
  companyName: string | null;
  gstin: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
}

export interface DocumentTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
}

export function DocumentView({
  party,
  partyLabel,
  lines,
  totals,
  settings,
  notes,
  terms,
  placeOfSupply,
  showAmountInWords = true,
}: {
  party: DocumentParty;
  partyLabel: string;
  lines: DocumentLine[];
  totals: DocumentTotals;
  settings: CompanyProfile;
  notes: string | null;
  terms: string | null;
  placeOfSupply: string | null;
  showAmountInWords?: boolean;
}) {
  const intraState = totals.igstAmount === 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Parties -------------------------------------------------------- */}
      <Card>
        <CardBody className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle">
              From
            </p>
            <p className="mt-1.5 text-[15px] font-semibold text-fg">
              {settings.name}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
              {formatAddress(settings)}
            </p>
            {settings.gstin && (
              <p className="mt-1.5 text-[12.5px] text-fg-muted">
                GSTIN:{" "}
                <span className="font-mono text-fg">{settings.gstin}</span>
              </p>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle">
              {partyLabel}
            </p>
            <p className="mt-1.5 text-[15px] font-semibold text-fg">
              {party.companyName ?? party.name}
            </p>
            {party.companyName && (
              <p className="text-[13px] text-fg-muted">{party.name}</p>
            )}
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
              {formatAddress(party)}
            </p>
            {party.gstin && (
              <p className="mt-1.5 text-[12.5px] text-fg-muted">
                GSTIN: <span className="font-mono text-fg">{party.gstin}</span>
              </p>
            )}
            {placeOfSupply && (
              <p className="mt-1 text-[12.5px] text-fg-muted">
                Place of supply:{" "}
                <span className="text-fg">{placeOfSupply}</span>
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Line items ----------------------------------------------------- */}
      <Card>
        <CardHeader title="Items" />

        <div className="scroll-x">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-10 px-4 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle">
                  #
                </th>
                <th className="px-3 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle">
                  Description
                </th>
                <th className="px-3 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle">
                  HSN/SAC
                </th>
                <th className="px-3 py-2.5 text-right text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle">
                  Qty
                </th>
                <th className="px-3 py-2.5 text-right text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle">
                  Rate
                </th>
                <th className="px-3 py-2.5 text-right text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle">
                  Tax
                </th>
                <th className="px-4 py-2.5 text-right text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr
                  key={line.id}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="tnum px-4 py-3 align-top text-fg-subtle">
                    {index + 1}
                  </td>
                  <td className="px-3 py-3 align-top text-fg">
                    {line.description}
                  </td>
                  <td className="px-3 py-3 align-top font-mono text-[12.5px] text-fg-muted">
                    {line.hsnCode ?? "—"}
                  </td>
                  <td className="tnum px-3 py-3 text-right align-top text-fg">
                    {line.quantity} {line.unit}
                  </td>
                  <td className="tnum px-3 py-3 text-right align-top text-fg">
                    {formatAmount(line.unitPrice)}
                  </td>
                  <td className="tnum px-3 py-3 text-right align-top text-fg-muted">
                    {line.taxRate}%
                  </td>
                  <td className="tnum px-4 py-3 text-right align-top font-medium text-fg">
                    {formatAmount(line.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals ------------------------------------------------------- */}
        <div className="border-t border-border px-4 py-4 sm:px-5">
          <div className="ml-auto flex w-full max-w-sm flex-col gap-2">
            <TotalRow label="Subtotal" value={totals.subtotal} />

            {totals.discountAmount > 0 && (
              <>
                <TotalRow label="Discount" value={-totals.discountAmount} />
                <TotalRow label="Taxable value" value={totals.taxableAmount} />
              </>
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
              <span className="tnum text-[18px] font-semibold text-fg">
                {formatCurrency(totals.total)}
              </span>
            </div>
          </div>

          {showAmountInWords && (
            <p className="mt-4 border-t border-border pt-3 text-[12.5px] leading-relaxed text-fg-muted">
              <span className="font-medium text-fg">Amount in words: </span>
              {amountInWords(totals.total)}
            </p>
          )}
        </div>
      </Card>

      {(notes || terms || settings.bankAccountNo) && (
        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
          {(notes || terms) && (
            <Card>
              <CardHeader title="Notes & terms" />
              <CardBody className="flex flex-col gap-4">
                {notes && (
                  <div>
                    <p className="text-[12px] font-medium uppercase tracking-wide text-fg-subtle">
                      Notes
                    </p>
                    <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-fg">
                      {notes}
                    </p>
                  </div>
                )}
                {terms && (
                  <div>
                    <p className="text-[12px] font-medium uppercase tracking-wide text-fg-subtle">
                      Terms & conditions
                    </p>
                    <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-fg">
                      {terms}
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {settings.bankAccountNo && (
            <Card>
              <CardHeader title="Bank details" />
              <CardBody>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 text-[13px]">
                  <dt className="text-fg-subtle">Bank</dt>
                  <dd className="text-fg">{settings.bankName}</dd>
                  <dt className="text-fg-subtle">Account</dt>
                  <dd className="font-mono text-fg">
                    {settings.bankAccountNo}
                  </dd>
                  <dt className="text-fg-subtle">IFSC</dt>
                  <dd className="font-mono text-fg">{settings.bankIfsc}</dd>
                  {settings.bankBranch && (
                    <>
                      <dt className="text-fg-subtle">Branch</dt>
                      <dd className="text-fg">{settings.bankBranch}</dd>
                    </>
                  )}
                </dl>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
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
      <span
        className={
          muted ? "text-[13px] text-fg-subtle" : "text-[13px] text-fg-muted"
        }
      >
        {label}
      </span>
      <span className="tnum text-[13.5px] font-medium text-fg">
        {formatCurrency(value)}
      </span>
    </div>
  );
}
