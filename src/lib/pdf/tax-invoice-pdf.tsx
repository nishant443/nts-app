import "server-only";

import path from "node:path";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { amountInWords, formatAmount, round2 } from "@/lib/money";
import { formatAddress, type CompanyProfile } from "@/lib/settings";
import { stateCode } from "@/lib/tax";

import type { PdfLine, PdfParty } from "./document-pdf";

Font.register({
  family: "Noto Sans",
  fonts: [
    { src: path.join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf") },
    {
      src: path.join(process.cwd(), "public", "fonts", "NotoSans-Bold.ttf"),
      fontWeight: 700,
    },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

const INK = "#1f2937";
const MUTED = "#4b5563";
const LINE = "#9aa3af";
const BAND = "#e5e7eb";
const BRAND = "#1a6dff";

const rupee = (n: number) => `₹ ${formatAmount(n)}`;

const s = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 30,
    paddingHorizontal: 30,
    fontFamily: "Noto Sans",
    fontSize: 8.5,
    color: INK,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 8,
  },
  box: { borderWidth: 1, borderColor: LINE },
  row: { flexDirection: "row" },
  cell: { borderColor: LINE },
  band: { backgroundColor: BAND, fontWeight: 700, paddingVertical: 3, paddingHorizontal: 5 },

  head: { flexDirection: "row", alignItems: "center", padding: 8, borderBottomWidth: 1, borderColor: LINE },
  logo: { width: 150, marginRight: 14 },
  company: { fontSize: 17, fontWeight: 700, letterSpacing: 0.2 },
  companyLine: { fontSize: 8.5, color: MUTED, marginTop: 2 },
  kv: { flexDirection: "row", marginTop: 3 },
  k: { color: MUTED },
  v: { fontWeight: 700 },

  partyHead: { flexDirection: "row", borderBottomWidth: 1, borderColor: LINE },
  partyBody: { flexDirection: "row", borderBottomWidth: 1, borderColor: LINE },
  half: { flex: 1, padding: 6 },
  partyName: { fontWeight: 700, fontSize: 9.5 },
  partyLine: { marginTop: 2, lineHeight: 1.35, fontSize: 8.2 },

  th: { fontWeight: 700, paddingVertical: 4, paddingHorizontal: 4, backgroundColor: BAND },
  td: { paddingVertical: 4, paddingHorizontal: 4 },
  right: { textAlign: "right" },
  cIdx: { width: 22 },
  cDesc: { flex: 1 },
  cHsn: { width: 62 },
  cQty: { width: 50, textAlign: "right" },
  cUnit: { width: 36, textAlign: "right" },
  cRate: { width: 74, textAlign: "right" },
  cGst: { width: 84, textAlign: "right" },
  cAmt: { width: 78, textAlign: "right" },
  vline: { borderRightWidth: 1, borderColor: LINE },
  hline: { borderBottomWidth: 1, borderColor: LINE },
  bold: { fontWeight: 700 },

  lower: { flexDirection: "row", borderTopWidth: 1, borderColor: LINE },
  taxSide: { flex: 1.65, borderRightWidth: 1, borderColor: LINE },
  totalsSide: { flex: 1 },
  tsHead: { flexDirection: "row", backgroundColor: BAND, fontWeight: 700 },
  tsCell: { paddingVertical: 3, paddingHorizontal: 3, borderRightWidth: 1, borderColor: LINE, fontSize: 8 },
  tsRow: { flexDirection: "row", borderTopWidth: 1, borderColor: LINE },
  tHsn: { width: 46 },
  tTaxable: { width: 66, textAlign: "right" },
  tRate: { width: 30, textAlign: "right" },
  tAmt: { width: 54, textAlign: "right" },
  tTotal: { flex: 1, textAlign: "right", borderRightWidth: 0 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 1, borderColor: LINE },
  words: { paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 1, borderColor: LINE },

  section: { borderTopWidth: 1, borderColor: LINE },
  sectionBody: { padding: 6, lineHeight: 1.45 },
  bankRow: { flexDirection: "row", borderTopWidth: 1, borderColor: LINE },
  bankSide: { flex: 1, borderRightWidth: 1, borderColor: LINE },
  signSide: { flex: 1 },
  bankBody: { flexDirection: "row", padding: 6, gap: 8 },
  qr: { width: 64, height: 64 },
  signBody: { padding: 6, alignItems: "center", justifyContent: "center", minHeight: 78 },
  signImage: { width: 110, height: 44, objectFit: "contain" },
  signText: { marginTop: 4, color: MUTED },
});

export interface TaxInvoicePdfProps {
  number: string;
  date: string;
  dueDate?: string;
  poNumber: string | null;
  poDate?: string;
  party: PdfParty;
  settings: CompanyProfile;
  subject: string | null;
  notes: string | null;
  terms: string | null;
  placeOfSupply: string | null;
  lines: PdfLine[];
  totals: {
    subtotal: number;
    discountAmount: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    total: number;
  };
  amountPaid: number;
  assets: { logo?: Buffer; signature?: Buffer; upiQr?: Buffer };
}

export function TaxInvoicePdf(props: TaxInvoicePdfProps) {
  const { settings, party, totals } = props;
  const intraState = totals.igstAmount === 0;

  const partyName = party.companyName ?? party.name;
  const partyCode = party.gstin ? party.gstin.slice(0, 2) : stateCode(party.state);
  const companyCode = settings.gstin ? settings.gstin.slice(0, 2) : stateCode(settings.state);

  const discountShare = totals.subtotal > 0 ? totals.discountAmount / totals.subtotal : 0;
  const lineRows = props.lines.map((line) => {
    const taxable = round2(line.lineTotal * (1 - discountShare));
    const tax = round2((taxable * line.taxRate) / 100);
    return { ...line, taxable, tax, amount: round2(taxable + tax) };
  });

  const summary = new Map<string, { hsn: string; rate: number; taxable: number; tax: number }>();
  for (const row of lineRows) {
    const key = `${row.hsnCode ?? "—"}|${row.taxRate}`;
    const entry = summary.get(key) ?? { hsn: row.hsnCode ?? "—", rate: row.taxRate, taxable: 0, tax: 0 };
    entry.taxable = round2(entry.taxable + row.taxable);
    entry.tax = round2(entry.tax + row.tax);
    summary.set(key, entry);
  }
  const summaryRows = [...summary.values()];
  const totalQty = lineRows.reduce((a, r) => a + r.quantity, 0);
  const totalTax = round2(totals.cgstAmount + totals.sgstAmount + totals.igstAmount);
  const balance = round2(totals.total - props.amountPaid);

  return (
    <Document title={`Tax Invoice ${props.number}`} author={settings.name} creator={settings.name}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Tax Invoice</Text>

        <View style={s.box}>
          <View style={s.head}>
            {props.assets.logo && (
              <Image style={s.logo} src={{ data: props.assets.logo, format: "png" }} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.company}>{settings.name.toUpperCase()}</Text>
              <Text style={s.companyLine}>{formatAddress(settings)}</Text>
              <View style={[s.kv, { justifyContent: "space-between" }]}>
                <Text>
                  <Text style={s.k}>Phone: </Text>
                  <Text style={s.v}>{settings.phone ?? "—"}</Text>
                </Text>
                <Text>
                  <Text style={s.k}>Email: </Text>
                  <Text style={s.v}>{settings.email ?? "—"}</Text>
                </Text>
              </View>
              <View style={[s.kv, { justifyContent: "space-between" }]}>
                <Text>
                  <Text style={s.k}>GSTIN: </Text>
                  <Text style={s.v}>{settings.gstin ?? "—"}</Text>
                </Text>
                <Text>
                  <Text style={s.k}>State: </Text>
                  <Text style={s.v}>
                    {companyCode ? `${companyCode}-` : ""}
                    {settings.state ?? settings.homeState}
                  </Text>
                </Text>
              </View>
            </View>
          </View>

          <View style={s.partyHead}>
            <Text style={[s.band, { flex: 1, borderRightWidth: 1, borderColor: LINE }]}>Bill To:</Text>
            <Text style={[s.band, { flex: 1 }]}>Invoice Details:</Text>
          </View>
          <View style={s.partyBody}>
            <View style={[s.half, { borderRightWidth: 1, borderColor: LINE }]}>
              <Text style={s.partyName}>{partyName.toUpperCase()}</Text>
              {[party.addressLine1, party.addressLine2].some(Boolean) && (
                <Text style={s.partyLine}>
                  {[party.addressLine1, party.addressLine2].filter(Boolean).join(", ")}
                </Text>
              )}
              {[party.city, party.state, party.postalCode].some(Boolean) && (
                <Text style={s.partyLine}>
                  {[party.city, party.state].filter(Boolean).join(", ")}
                  {party.postalCode ? ` - ${party.postalCode}` : ""}
                </Text>
              )}
              <View style={[s.kv, { gap: 18 }]}>
                {party.phone && (
                  <Text>
                    <Text style={s.k}>Contact No: </Text>
                    <Text style={s.v}>{party.phone}</Text>
                  </Text>
                )}
                {party.gstin && (
                  <Text>
                    <Text style={s.k}>GSTIN: </Text>
                    <Text style={s.v}>{party.gstin}</Text>
                  </Text>
                )}
              </View>
              {party.state && (
                <Text style={s.kv}>
                  <Text style={s.k}>State: </Text>
                  <Text style={s.v}>
                    {partyCode ? `${partyCode}-` : ""}
                    {party.state}
                  </Text>
                </Text>
              )}
            </View>
            <View style={[s.half, { flexDirection: "row" }]}>
              <View style={{ flex: 1 }}>
                <Text>
                  <Text style={s.k}>Invoice No.: </Text>
                  <Text style={s.v}>{props.number}</Text>
                </Text>
                <Text style={s.kv}>
                  <Text style={s.k}>Date: </Text>
                  <Text style={s.v}>{props.date}</Text>
                </Text>
                {props.dueDate && (
                  <Text style={s.kv}>
                    <Text style={s.k}>Due: </Text>
                    <Text style={s.v}>{props.dueDate}</Text>
                  </Text>
                )}
              </View>
              {(props.poNumber || props.poDate) && (
                <View style={{ flex: 1 }}>
                  {props.poDate && (
                    <Text>
                      <Text style={s.k}>PO Date: </Text>
                      <Text style={s.v}>{props.poDate}</Text>
                    </Text>
                  )}
                  {props.poNumber && (
                    <Text style={s.kv}>
                      <Text style={s.k}>PO No: </Text>
                      <Text style={s.v}>{props.poNumber}</Text>
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          <View style={[s.row, s.hline]}>
            <Text style={[s.th, s.cIdx, s.vline]}>#</Text>
            <Text style={[s.th, s.cDesc, s.vline]}>Description</Text>
            <Text style={[s.th, s.cHsn, s.vline]}>HSN/ SAC</Text>
            <Text style={[s.th, s.cQty, s.vline]}>Quantity</Text>
            <Text style={[s.th, s.cUnit, s.vline]}>Unit</Text>
            <Text style={[s.th, s.cRate, s.vline]}>Price/ Unit(₹)</Text>
            <Text style={[s.th, s.cGst, s.vline]}>GST(₹)</Text>
            <Text style={[s.th, s.cAmt]}>Amount(₹)</Text>
          </View>
          {lineRows.map((row, index) => (
            <View key={index} style={[s.row, s.hline]} wrap={false}>
              <Text style={[s.td, s.cIdx, s.vline]}>{index + 1}</Text>
              <Text style={[s.td, s.cDesc, s.vline, s.bold]}>{row.description}</Text>
              <Text style={[s.td, s.cHsn, s.vline]}>{row.hsnCode ?? ""}</Text>
              <Text style={[s.td, s.cQty, s.vline]}>{formatAmount(row.quantity).replace(/\.00$/, "")}</Text>
              <Text style={[s.td, s.cUnit, s.vline]}>{row.unit}</Text>
              <Text style={[s.td, s.cRate, s.vline]}>{rupee(row.unitPrice)}</Text>
              <Text style={[s.td, s.cGst, s.vline]}>
                {rupee(row.tax)} ({formatAmount(row.taxRate).replace(/\.00$/, "")}%)
              </Text>
              <Text style={[s.td, s.cAmt]}>{rupee(row.amount)}</Text>
            </View>
          ))}
          <View style={s.row}>
            <Text style={[s.td, s.cIdx, s.vline]} />
            <Text style={[s.td, s.cDesc, s.vline, s.bold]}>Total</Text>
            <Text style={[s.td, s.cHsn, s.vline]} />
            <Text style={[s.td, s.cQty, s.vline, s.bold]}>{formatAmount(totalQty).replace(/\.00$/, "")}</Text>
            <Text style={[s.td, s.cUnit, s.vline]} />
            <Text style={[s.td, s.cRate, s.vline]} />
            <Text style={[s.td, s.cGst, s.vline, s.bold]}>{rupee(totalTax)}</Text>
            <Text style={[s.td, s.cAmt, s.bold]}>{rupee(totals.total)}</Text>
          </View>

          <View style={s.lower}>
            <View style={s.taxSide}>
              <Text style={[s.band, s.hline]}>Tax Summary:</Text>
              <View style={s.tsHead}>
                <Text style={[s.tsCell, s.tHsn]}>HSN/ SAC</Text>
                <Text style={[s.tsCell, s.tTaxable]}>Taxable (₹)</Text>
                {intraState ? (
                  <>
                    <Text style={[s.tsCell, s.tRate]}>CGST %</Text>
                    <Text style={[s.tsCell, s.tAmt]}>Amt (₹)</Text>
                    <Text style={[s.tsCell, s.tRate]}>SGST %</Text>
                    <Text style={[s.tsCell, s.tAmt]}>Amt (₹)</Text>
                  </>
                ) : (
                  <>
                    <Text style={[s.tsCell, s.tRate]}>IGST %</Text>
                    <Text style={[s.tsCell, s.tAmt]}>Amt (₹)</Text>
                  </>
                )}
                <Text style={[s.tsCell, s.tTotal]}>Total tax (₹)</Text>
              </View>
              {summaryRows.map((row) => {
                const half = round2(row.tax / 2);
                return (
                  <View key={`${row.hsn}-${row.rate}`} style={s.tsRow}>
                    <Text style={[s.tsCell, s.tHsn]}>{row.hsn}</Text>
                    <Text style={[s.tsCell, s.tTaxable]}>{formatAmount(row.taxable)}</Text>
                    {intraState ? (
                      <>
                        <Text style={[s.tsCell, s.tRate]}>{row.rate / 2}</Text>
                        <Text style={[s.tsCell, s.tAmt]}>{formatAmount(half)}</Text>
                        <Text style={[s.tsCell, s.tRate]}>{row.rate / 2}</Text>
                        <Text style={[s.tsCell, s.tAmt]}>{formatAmount(round2(row.tax - half))}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={[s.tsCell, s.tRate]}>{row.rate}</Text>
                        <Text style={[s.tsCell, s.tAmt]}>{formatAmount(row.tax)}</Text>
                      </>
                    )}
                    <Text style={[s.tsCell, s.tTotal]}>{formatAmount(row.tax)}</Text>
                  </View>
                );
              })}
              <View style={[s.tsRow, { fontWeight: 700 }]}>
                <Text style={[s.tsCell, s.tHsn, s.right]}>TOTAL</Text>
                <Text style={[s.tsCell, s.tTaxable]}>{formatAmount(totals.taxableAmount)}</Text>
                {intraState ? (
                  <>
                    <Text style={[s.tsCell, s.tRate]} />
                    <Text style={[s.tsCell, s.tAmt]}>{formatAmount(totals.cgstAmount)}</Text>
                    <Text style={[s.tsCell, s.tRate]} />
                    <Text style={[s.tsCell, s.tAmt]}>{formatAmount(totals.sgstAmount)}</Text>
                  </>
                ) : (
                  <>
                    <Text style={[s.tsCell, s.tRate]} />
                    <Text style={[s.tsCell, s.tAmt]}>{formatAmount(totals.igstAmount)}</Text>
                  </>
                )}
                <Text style={[s.tsCell, s.tTotal]}>{formatAmount(totalTax)}</Text>
              </View>
            </View>

            <View style={s.totalsSide}>
              <View style={s.totalLine}>
                <Text>Sub Total</Text>
                <Text>{rupee(totals.subtotal)}</Text>
              </View>
              {totals.discountAmount > 0 && (
                <View style={s.totalLine}>
                  <Text>Discount</Text>
                  <Text>- {rupee(totals.discountAmount)}</Text>
                </View>
              )}
              <View style={[s.totalLine, { fontWeight: 700, fontSize: 9.5 }]}>
                <Text>Total</Text>
                <Text>{rupee(totals.total)}</Text>
              </View>
              <Text style={[s.band, s.hline]}>Invoice Amount in Words:</Text>
              <Text style={s.words}>{amountInWords(totals.total)}</Text>
              <View style={s.totalLine}>
                <Text>Received</Text>
                <Text>{rupee(props.amountPaid)}</Text>
              </View>
              <View style={[s.totalLine, { borderBottomWidth: 0, fontWeight: 700 }]}>
                <Text>Balance</Text>
                <Text>{rupee(balance)}</Text>
              </View>
            </View>
          </View>

          {(props.terms || props.subject || props.notes) && (
            <View style={s.section}>
              <Text style={[s.band, s.hline]}>Terms &amp; Conditions:</Text>
              <Text style={s.sectionBody}>
                {[props.subject, props.terms, props.notes].filter(Boolean).join("\n")}
              </Text>
            </View>
          )}

          <View style={s.bankRow}>
            <View style={s.bankSide}>
              <Text style={[s.band, s.hline]}>Bank Details:</Text>
              <View style={s.bankBody}>
                {props.assets.upiQr && (
                  <View>
                    <Image style={s.qr} src={{ data: props.assets.upiQr, format: "png" }} />
                    <Text style={{ fontSize: 6.5, color: BRAND, textAlign: "center", marginTop: 2 }}>
                      UPI · SCAN TO PAY
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, lineHeight: 1.5 }}>
                  {settings.bankName && (
                    <Text>
                      <Text style={s.k}>Name : </Text>
                      <Text style={s.v}>
                        {settings.bankName.toUpperCase()}
                        {settings.bankBranch ? `, ${settings.bankBranch.toUpperCase()}` : ""}
                      </Text>
                    </Text>
                  )}
                  {settings.bankAccountNo && (
                    <Text>
                      <Text style={s.k}>Account No. : </Text>
                      <Text style={s.v}>{settings.bankAccountNo}</Text>
                    </Text>
                  )}
                  {settings.bankIfsc && (
                    <Text>
                      <Text style={s.k}>IFSC code : </Text>
                      <Text style={s.v}>{settings.bankIfsc}</Text>
                    </Text>
                  )}
                  {settings.bankHolderName && (
                    <Text>
                      <Text style={s.k}>Account holder&apos;s name : </Text>
                      <Text style={s.v}>{settings.bankHolderName.toUpperCase()}</Text>
                    </Text>
                  )}
                </View>
              </View>
            </View>
            <View style={s.signSide}>
              <Text style={[s.band, s.hline]}>For {settings.name.toUpperCase()}:</Text>
              <View style={s.signBody}>
                {props.assets.signature && (
                  <Image style={s.signImage} src={{ data: props.assets.signature, format: "png" }} />
                )}
                <Text style={s.signText}>Authorized Signatory</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
