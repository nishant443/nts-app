import "server-only";

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
    paddingBottom: 44,
    paddingHorizontal: 34,
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
    marginBottom: 12,
  },
  logo: { width: 128 },
  companyBlock: { alignItems: "flex-end", maxWidth: 230 },
  companyName: { fontSize: 11.5, fontFamily: "Helvetica-Bold" },
  companyLine: { fontSize: 8, color: MUTED, textAlign: "right", marginTop: 2 },

  title: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  period: {
    fontSize: 9.5,
    color: MUTED,
    textAlign: "center",
    marginBottom: 12,
  },

  card: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    marginBottom: 10,
  },
  cardHead: {
    backgroundColor: WASH,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  cardHeadText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    letterSpacing: 0.6,
  },

  kvRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8 },
  kvKey: { width: "45%", fontSize: 8.5, color: MUTED },
  kvValue: { flex: 1, fontSize: 8.5, color: INK },

  twoCol: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },

  moneyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  moneyLabel: { fontSize: 8.5, color: MUTED },
  moneyValue: { fontSize: 8.5, color: INK },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: WASH,
  },
  totalLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: INK },
  totalValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: INK },

  netBox: {
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 4,
    padding: 10,
    marginTop: 2,
  },
  netRow: { flexDirection: "row", justifyContent: "space-between" },
  netLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK },
  netValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BRAND },
  netWords: { fontSize: 8, color: MUTED, marginTop: 5, lineHeight: 1.4 },

  attendanceRow: { flexDirection: "row" },
  attendanceCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRightWidth: 1,
    borderRightColor: LINE,
  },
  attendanceValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: INK },
  attendanceLabel: { fontSize: 7.5, color: MUTED, marginTop: 2 },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 34,
    right: 34,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 6,
  },
  footerText: { fontSize: 7.5, color: MUTED, textAlign: "center" },
});

export interface PayslipPdfProps {
  settings: CompanyProfile;
  employee: {
    name: string;
    employeeCode: string;
    designation: string | null;
    department: string | null;
    dateOfJoining: string | null;
    panNumber: string | null;
    uanNumber: string | null;
    bankName: string | null;
    bankAccountNo: string | null;
  };
  period: string;
  attendance: {
    workingDays: number;
    presentDays: number;
    paidLeaveDays: number;
    lopDays: number;
  };
  earnings: { label: string; value: number }[];
  deductions: { label: string; value: number }[];
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  assets: { logo?: Buffer };
}

export function PayslipPdf(props: PayslipPdfProps) {
  const { settings, employee } = props;

  return (
    <Document
      title={`Payslip ${employee.employeeCode} ${props.period}`}
      author={settings.name}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
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
            {settings.email && (
              <Text style={styles.companyLine}>{settings.email}</Text>
            )}
          </View>
        </View>

        <Text style={styles.title}>PAYSLIP</Text>
        <Text style={styles.period}>{props.period}</Text>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardHeadText}>EMPLOYEE DETAILS</Text>
          </View>

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Kv label="Name" value={employee.name} />
              <Kv label="Employee code" value={employee.employeeCode} />
              <Kv label="Designation" value={employee.designation} />
              <Kv label="Department" value={employee.department} />
            </View>
            <View style={styles.col}>
              <Kv label="Date of joining" value={employee.dateOfJoining} />
              <Kv label="PAN" value={employee.panNumber} />
              <Kv label="UAN" value={employee.uanNumber} />
              <Kv
                label="Bank account"
                value={
                  employee.bankAccountNo
                    ? `${employee.bankName ?? ""} ${employee.bankAccountNo}`.trim()
                    : null
                }
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardHeadText}>ATTENDANCE</Text>
          </View>
          <View style={styles.attendanceRow}>
            <Attendance
              value={props.attendance.workingDays}
              label="Working days"
            />
            <Attendance value={props.attendance.presentDays} label="Present" />
            <Attendance
              value={props.attendance.paidLeaveDays}
              label="Paid leave"
            />
            <Attendance value={props.attendance.lopDays} label="Loss of pay" />
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardHeadText}>EARNINGS</Text>
              </View>
              {props.earnings.map((entry) => (
                <View key={entry.label} style={styles.moneyRow}>
                  <Text style={styles.moneyLabel}>{entry.label}</Text>
                  <Text style={styles.moneyValue}>
                    {formatAmount(entry.value)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Gross earnings</Text>
                <Text style={styles.totalValue}>
                  {formatAmount(props.grossEarnings)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.col}>
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardHeadText}>DEDUCTIONS</Text>
              </View>
              {props.deductions.length === 0 ? (
                <View style={styles.moneyRow}>
                  <Text style={styles.moneyLabel}>No deductions</Text>
                  <Text style={styles.moneyValue}>0.00</Text>
                </View>
              ) : (
                props.deductions.map((entry) => (
                  <View key={entry.label} style={styles.moneyRow}>
                    <Text style={styles.moneyLabel}>{entry.label}</Text>
                    <Text style={styles.moneyValue}>
                      {formatAmount(entry.value)}
                    </Text>
                  </View>
                ))
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total deductions</Text>
                <Text style={styles.totalValue}>
                  {formatAmount(props.totalDeductions)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.netBox}>
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Net pay</Text>
            <Text style={styles.netValue}>{formatAmount(props.netPay)}</Text>
          </View>
          <Text style={styles.netWords}>{amountInWords(props.netPay)}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            This is a computer-generated payslip and does not require a
            signature.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function Kv({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{label}</Text>
      <Text style={styles.kvValue}>{value || "—"}</Text>
    </View>
  );
}

function Attendance({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.attendanceCell}>
      <Text style={styles.attendanceValue}>{value}</Text>
      <Text style={styles.attendanceLabel}>{label}</Text>
    </View>
  );
}
