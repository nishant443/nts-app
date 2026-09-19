import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { amountInWords, formatAmount } from "@/lib/money";
import { formatAddress, type CompanyProfile } from "@/lib/settings";

const BRAND = "#1a6dff";
const INK = "#131a24";
const MUTED = "#566274";
const LINE = "#d9dee6";
const WASH = "#f5f7fa";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 56,
    paddingHorizontal: 32,
    fontSize: 9,
    color: INK,
    fontFamily: "Helvetica",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    paddingBottom: 10,
    marginBottom: 14,
  },
  logo: { width: 132 },
  companyBlock: { alignItems: "flex-end", maxWidth: 230 },
  companyName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: INK },
  companyLine: { fontSize: 8, color: MUTED, textAlign: "right", marginTop: 2 },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: INK,
    letterSpacing: 0.4,
  },
  metaBox: { alignItems: "flex-end" },
  metaLine: { fontSize: 9, color: MUTED, marginTop: 2 },
  metaValue: { fontFamily: "Helvetica-Bold", color: INK },

  partyRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  party: {
    flex: 1,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    padding: 9,
  },
  partyLabel: {
    fontSize: 7.5,
    color: MUTED,
    letterSpacing: 0.7,
    marginBottom: 3,
    fontFamily: "Helvetica-Bold",
  },
  partyName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: INK },
  partyLine: { fontSize: 8.5, color: MUTED, marginTop: 2, lineHeight: 1.4 },

  table: { borderWidth: 1, borderColor: LINE, borderRadius: 4 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: WASH,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  th: { fontSize: 7.5, color: MUTED, fontFamily: "Helvetica-Bold" },
  td: { fontSize: 8.5, color: INK },

  colIndex: { width: 18 },
  colDesc: { flex: 1, paddingRight: 6 },
  colHsn: { width: 50 },
  colQty: { width: 46, textAlign: "right" },
  colRate: { width: 58, textAlign: "right" },
  colTax: { width: 34, textAlign: "right" },
  colAmount: { width: 66, textAlign: "right" },

  summaryRow: { flexDirection: "row", marginTop: 12, gap: 12 },
  summaryLeft: { flex: 1 },
  summaryRight: { width: 210 },

  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalLabel: { fontSize: 9, color: MUTED },
  totalValue: { fontSize: 9, color: INK },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: LINE,
    marginTop: 4,
    paddingTop: 6,
  },
  grandLabel: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: INK },
  grandValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: BRAND },

  block: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    padding: 8,
    marginTop: 10,
  },
  blockLabel: {
    fontSize: 7.5,
    color: MUTED,
    letterSpacing: 0.7,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  blockText: { fontSize: 8.5, color: INK, lineHeight: 1.5 },

  signRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 26,
  },
  signBox: { width: 180, alignItems: "center" },
  signImage: { width: 92, height: 38, objectFit: "contain" },
  signLine: {
    borderTopWidth: 1,
    borderTopColor: LINE,
    width: "100%",
    marginTop: 4,
    paddingTop: 4,
  },
  signText: { fontSize: 8, color: MUTED, textAlign: "center" },

  footer: {
    position: "absolute",
    bottom: 22,
    left: 32,
    right: 32,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7.5, color: MUTED },
});

export interface PdfLine {
  description: string;
  hsnCode: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

export interface PdfParty {
  name: string;
  companyName: string | null;
  gstin: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
}

export interface PdfDocumentProps {
  title: string;
  number: string;
  date: string;
  secondaryLabel?: string;
  secondaryValue?: string;
  partyLabel: string;
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
  extraTotals?: { label: string; value: number }[];
  assets: { logo?: Buffer; signature?: Buffer };
}

export function DocumentPdf(props: PdfDocumentProps) {
  const { settings, totals } = props;
  const intraState = totals.igstAmount === 0;

  return (
    <Document
      title={`${props.title} ${props.number}`}
      author={settings.name}
      creator={settings.name}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          {props.assets.logo ? (
            <Image
              style={styles.logo}
              src={{ data: props.assets.logo, format: "png" }}
            />
          ) : (
            <Text style={styles.companyName}>{settings.name}</Text>
          )}

          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{settings.name}</Text>
            <Text style={styles.companyLine}>{formatAddress(settings)}</Text>
            {settings.phone && (
              <Text style={styles.companyLine}>{settings.phone}</Text>
            )}
            {settings.email && (
              <Text style={styles.companyLine}>{settings.email}</Text>
            )}
            {settings.gstin && (
              <Text style={styles.companyLine}>GSTIN: {settings.gstin}</Text>
            )}
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>{props.title.toUpperCase()}</Text>
          <View style={styles.metaBox}>
            <Text style={styles.metaLine}>
              No: <Text style={styles.metaValue}>{props.number}</Text>
            </Text>
            <Text style={styles.metaLine}>
              Date: <Text style={styles.metaValue}>{props.date}</Text>
            </Text>
            {props.secondaryValue && (
              <Text style={styles.metaLine}>
                {props.secondaryLabel}:{" "}
                <Text style={styles.metaValue}>{props.secondaryValue}</Text>
              </Text>
            )}
          </View>
        </View>

        <View style={styles.partyRow}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>FROM</Text>
            <Text style={styles.partyName}>{settings.name}</Text>
            <Text style={styles.partyLine}>{formatAddress(settings)}</Text>
            {settings.gstin && (
              <Text style={styles.partyLine}>GSTIN: {settings.gstin}</Text>
            )}
            {settings.pan && (
              <Text style={styles.partyLine}>PAN: {settings.pan}</Text>
            )}
          </View>

          <View style={styles.party}>
            <Text style={styles.partyLabel}>
              {props.partyLabel.toUpperCase()}
            </Text>
            <Text style={styles.partyName}>
              {props.party.companyName ?? props.party.name}
            </Text>
            {props.party.companyName && (
              <Text style={styles.partyLine}>{props.party.name}</Text>
            )}
            <Text style={styles.partyLine}>{formatAddress(props.party)}</Text>
            {props.party.gstin && (
              <Text style={styles.partyLine}>GSTIN: {props.party.gstin}</Text>
            )}
            {props.placeOfSupply && (
              <Text style={styles.partyLine}>
                Place of supply: {props.placeOfSupply}
              </Text>
            )}
          </View>
        </View>

        {props.subject && (
          <Text style={{ fontSize: 9.5, marginBottom: 8, color: INK }}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Subject: </Text>
            {props.subject}
          </Text>
        )}

        <View style={styles.table}>
          <View style={styles.tableHead} fixed>
            <Text style={[styles.th, styles.colIndex]}>#</Text>
            <Text style={[styles.th, styles.colDesc]}>DESCRIPTION</Text>
            <Text style={[styles.th, styles.colHsn]}>HSN/SAC</Text>
            <Text style={[styles.th, styles.colQty]}>QTY</Text>
            <Text style={[styles.th, styles.colRate]}>RATE</Text>
            <Text style={[styles.th, styles.colTax]}>TAX</Text>
            <Text style={[styles.th, styles.colAmount]}>AMOUNT</Text>
          </View>

          {props.lines.map((line, index) => (
            <View key={index} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, styles.colIndex]}>{index + 1}</Text>
              <Text style={[styles.td, styles.colDesc]}>
                {line.description}
              </Text>
              <Text style={[styles.td, styles.colHsn]}>
                {line.hsnCode ?? "-"}
              </Text>
              <Text style={[styles.td, styles.colQty]}>
                {line.quantity} {line.unit}
              </Text>
              <Text style={[styles.td, styles.colRate]}>
                {formatAmount(line.unitPrice)}
              </Text>
              <Text style={[styles.td, styles.colTax]}>{line.taxRate}%</Text>
              <Text style={[styles.td, styles.colAmount]}>
                {formatAmount(line.lineTotal)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <View style={styles.block}>
              <Text style={styles.blockLabel}>AMOUNT IN WORDS</Text>
              <Text style={styles.blockText}>
                {amountInWords(totals.total)}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRight}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {formatAmount(totals.subtotal)}
              </Text>
            </View>

            {totals.discountAmount > 0 && (
              <>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={styles.totalValue}>
                    -{formatAmount(totals.discountAmount)}
                  </Text>
                </View>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Taxable value</Text>
                  <Text style={styles.totalValue}>
                    {formatAmount(totals.taxableAmount)}
                  </Text>
                </View>
              </>
            )}

            {intraState ? (
              <>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>CGST</Text>
                  <Text style={styles.totalValue}>
                    {formatAmount(totals.cgstAmount)}
                  </Text>
                </View>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>SGST</Text>
                  <Text style={styles.totalValue}>
                    {formatAmount(totals.sgstAmount)}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>IGST</Text>
                <Text style={styles.totalValue}>
                  {formatAmount(totals.igstAmount)}
                </Text>
              </View>
            )}

            <View style={styles.grandTotal}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>
                {formatAmount(totals.total)}
              </Text>
            </View>

            {props.extraTotals?.map((entry) => (
              <View key={entry.label} style={styles.totalLine}>
                <Text style={styles.totalLabel}>{entry.label}</Text>
                <Text style={styles.totalValue}>
                  {formatAmount(entry.value)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {settings.bankAccountNo && (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>BANK DETAILS</Text>
            <Text style={styles.blockText}>
              {settings.bankName} · A/C {settings.bankAccountNo} · IFSC{" "}
              {settings.bankIfsc}
              {settings.bankBranch ? ` · ${settings.bankBranch}` : ""}
            </Text>
          </View>
        )}

        {props.notes && (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>NOTES</Text>
            <Text style={styles.blockText}>{props.notes}</Text>
          </View>
        )}

        {props.terms && (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>TERMS &amp; CONDITIONS</Text>
            <Text style={styles.blockText}>{props.terms}</Text>
          </View>
        )}

        <View style={styles.signRow} wrap={false}>
          <View style={styles.signBox}>
            {props.assets.signature && (
              <Image
                style={styles.signImage}
                src={{ data: props.assets.signature, format: "png" }}
              />
            )}
            <View style={styles.signLine}>
              <Text style={styles.signText}>For {settings.name}</Text>
              <Text style={styles.signText}>Authorised Signatory</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {settings.name}
            {settings.website ? ` · ${settings.website}` : ""}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

let assetCache: { logo?: Buffer; signature?: Buffer } | null = null;

export async function loadPdfAssets(): Promise<{
  logo?: Buffer;
  signature?: Buffer;
}> {
  if (assetCache) return assetCache;

  const read = async (relative: string) => {
    try {
      return await readFile(path.join(process.cwd(), "public", relative));
    } catch {
      return undefined;
    }
  };

  assetCache = {
    logo: await read("brand/nts-logo.png"),
    signature: await read("brand/authorised-signatory.png"),
  };

  return assetCache;
}
