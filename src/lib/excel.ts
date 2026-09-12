import "server-only";

import ExcelJS from "exceljs";

/**
 * Spreadsheet export.
 *
 * One helper builds every export so they all look the same: a branded title
 * row, bold headers, frozen header pane, sensible column widths, and currency
 * columns formatted with Indian digit grouping.
 */

const BRAND = "FF1A6DFF";

export interface SheetColumn<T> {
  header: string;
  key: string;
  width?: number;
  /** Renders as ₹ with two decimals and thousands separators. */
  money?: boolean;
  value: (row: T) => string | number | Date | null;
}

export interface SheetSpec<T> {
  name: string;
  columns: SheetColumn<T>[];
  rows: T[];
  /** Appended as a bold summary line under the data. */
  totals?: Record<string, number>;
}

/** Row type erased so a workbook can hold sheets of differing shapes. */
export type AnySheetSpec = SheetSpec<never>;

/**
 * Type-checks a sheet against its own row type, then erases it so sheets of
 * different shapes can sit in the same workbook:
 *
 *     buildWorkbook({ title, sheets: [sheet<Invoice>({ ... })] })
 */
export function sheet<T>(spec: SheetSpec<T>): AnySheetSpec {
  return spec as unknown as AnySheetSpec;
}

export async function buildWorkbook(options: {
  title: string;
  subtitle?: string;
  sheets: AnySheetSpec[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nutan Tech Solutions";
  workbook.created = new Date();

  for (const spec of options.sheets) {
    const sheet = workbook.addWorksheet(spec.name, {
      views: [{ state: "frozen", ySplit: 3 }],
    });

    // Title band.
    sheet.mergeCells(1, 1, 1, Math.max(1, spec.columns.length));
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = options.title;
    titleCell.font = { size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BRAND },
    };
    titleCell.alignment = { vertical: "middle", horizontal: "left" };
    sheet.getRow(1).height = 26;

    if (options.subtitle) {
      sheet.mergeCells(2, 1, 2, Math.max(1, spec.columns.length));
      const subtitleCell = sheet.getCell(2, 1);
      subtitleCell.value = options.subtitle;
      subtitleCell.font = { size: 10, color: { argb: "FF566274" } };
    }

    // Header row.
    const headerRow = sheet.getRow(3);
    spec.columns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = column.header;
      cell.font = { bold: true, size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F4F8" },
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFD5D9DD" } },
      };
      sheet.getColumn(index + 1).width = column.width ?? 18;
    });
    headerRow.commit();

    // Data.
    spec.rows.forEach((row, rowIndex) => {
      const sheetRow = sheet.getRow(4 + rowIndex);

      spec.columns.forEach((column, columnIndex) => {
        const cell = sheetRow.getCell(columnIndex + 1);
        cell.value = column.value(row);
        cell.font = { size: 10 };

        if (column.money) {
          cell.numFmt = '"₹"#,##,##0.00';
          cell.alignment = { horizontal: "right" };
        }
      });

      sheetRow.commit();
    });

    // Totals.
    if (spec.totals) {
      const totalRow = sheet.getRow(4 + spec.rows.length + 1);

      spec.columns.forEach((column, index) => {
        const cell = totalRow.getCell(index + 1);

        if (index === 0) {
          cell.value = "Total";
        } else if (column.key in spec.totals!) {
          cell.value = spec.totals![column.key]!;
          if (column.money) {
            cell.numFmt = '"₹"#,##,##0.00';
            cell.alignment = { horizontal: "right" };
          }
        }

        cell.font = { bold: true, size: 10 };
        cell.border = { top: { style: "thin", color: { argb: "FFD5D9DD" } } };
      });

      totalRow.commit();
    }

    // Enables filtering and sorting in Excel.
    if (spec.rows.length > 0) {
      sheet.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3 + spec.rows.length, column: spec.columns.length },
      };
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/** Response headers that make a browser save the file. */
export function spreadsheetHeaders(filename: string): HeadersInit {
  return {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
  };
}
