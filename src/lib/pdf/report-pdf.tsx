import "server-only";

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { formatAddress, type CompanyProfile } from "@/lib/settings";

const BRAND = "#1a6dff";
const INK = "#131a24";
const MUTED = "#566274";
const LINE = "#d9dee6";
const WASH = "#f5f7fa";

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 40,
    paddingHorizontal: 28,
    fontSize: 8.5,
    color: INK,
    fontFamily: "Helvetica",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    paddingBottom: 9,
    marginBottom: 11,
  },
  logo: { width: 120 },
  companyBlock: { alignItems: "flex-end", maxWidth: 240 },
  companyName: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  companyLine: { fontSize: 7.5, color: MUTED, textAlign: "right", marginTop: 2 },

  title: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  subtitle: { fontSize: 8.5, color: MUTED, marginTop: 3 },
  titleBlock: { marginBottom: 10 },

  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 3,
    backgroundColor: WASH,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  summaryItem: { marginRight: 26 },
  summaryLabel: { fontSize: 7, color: MUTED, letterSpacing: 0.4 },
  summaryValue: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 2 },

  table: { borderWidth: 1, borderColor: LINE, borderRadius: 3 },
  headRow: {
    flexDirection: "row",
    backgroundColor: WASH,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: WASH,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  cell: { paddingVertical: 5, paddingHorizontal: 6 },
  headText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED },
  totalText: { fontFamily: "Helvetica-Bold" },

  empty: { padding: 16, textAlign: "center", color: MUTED },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: LINE,
    paddingTop: 6,
    fontSize: 7.5,
    color: MUTED,
  },
});

export interface ReportColumn {
  header: string;
  width: number;
  align?: "left" | "right";
}

export interface ReportPdfProps {
  settings: CompanyProfile;
  title: string;
  subtitle?: string;
  generatedOn: string;
  summary?: { label: string; value: string }[];
  columns: ReportColumn[];
  rows: string[][];
  totals?: (string | null)[];
  assets: { logo?: Buffer };
  orientation?: "portrait" | "landscape";
}

export function ReportPdf(props: ReportPdfProps) {
  const { settings, columns } = props;
  const total = columns.reduce((sum, column) => sum + column.width, 0);
  const flex = (column: ReportColumn) => ({ width: `${(column.width / total) * 100}%` });

  return (
    <Document title={props.title} author={settings.name}>
      <Page
        size="A4"
        orientation={props.orientation ?? "landscape"}
        style={styles.page}
      >
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
            {settings.gstin && (
              <Text style={styles.companyLine}>GSTIN: {settings.gstin}</Text>
            )}
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{props.title.toUpperCase()}</Text>
          {props.subtitle && (
            <Text style={styles.subtitle}>{props.subtitle}</Text>
          )}
        </View>

        {props.summary && props.summary.length > 0 && (
          <View style={styles.summary}>
            {props.summary.map((entry) => (
              <View key={entry.label} style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{entry.label.toUpperCase()}</Text>
                <Text style={styles.summaryValue}>{entry.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.headRow} fixed>
            {columns.map((column) => (
              <View key={column.header} style={[styles.cell, flex(column)]}>
                <Text style={[styles.headText, { textAlign: column.align ?? "left" }]}>
                  {column.header}
                </Text>
              </View>
            ))}
          </View>

          {props.rows.length === 0 && (
            <Text style={styles.empty}>No records for this selection.</Text>
          )}

          {props.rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row} wrap={false}>
              {columns.map((column, columnIndex) => (
                <View key={column.header} style={[styles.cell, flex(column)]}>
                  <Text style={{ textAlign: column.align ?? "left" }}>
                    {row[columnIndex] ?? ""}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {props.totals && (
            <View style={styles.totalRow} wrap={false}>
              {columns.map((column, columnIndex) => (
                <View key={column.header} style={[styles.cell, flex(column)]}>
                  <Text
                    style={[
                      styles.totalText,
                      { textAlign: column.align ?? "left" },
                    ]}
                  >
                    {props.totals?.[columnIndex] ?? ""}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {settings.name} · Generated {props.generatedOn}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
