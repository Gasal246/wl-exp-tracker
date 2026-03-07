import ExcelJS from "exceljs";
import { format } from "date-fns";

export async function buildTransactionsWorkbook(params: {
  fileName: string;
  employee: {
    name: string;
    email: string;
  };
  selectedDateRange?: {
    from: Date;
    to: Date;
  };
  downloadedAt: Date;
  rows: Array<{
    date: string;
    description: string;
    type: string;
    amount: number;
  }>;
  totals: {
    expense: number;
  };
}) {
  const selectedDateLabel = params.selectedDateRange
    ? `${format(params.selectedDateRange.from, "dd-MM-yy")} to ${format(params.selectedDateRange.to, "dd-MM-yy")}`
    : "All Dates";

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Transactions", {
    views: [{ state: "frozen", ySplit: 6 }],
  });

  worksheet.columns = [
    { key: "date", width: 16 },
    { key: "description", width: 40 },
    { key: "type", width: 16 },
    { key: "amount", width: 16 },
  ];

  worksheet.mergeCells("A1:D1");
  worksheet.mergeCells("A2:D2");
  worksheet.mergeCells("B3:D3");
  worksheet.mergeCells("B4:D4");

  worksheet.getCell("A1").value = params.employee.name;
  worksheet.getCell("A2").value = params.employee.email;
  worksheet.getCell("A3").value = "Selected Date";
  worksheet.getCell("A4").value = "Download Date";
  worksheet.getCell("B3").value = selectedDateLabel;
  worksheet.getCell("B4").value = format(params.downloadedAt, "dd-MM-yy HH:mm");

  worksheet.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: "FF1F2937" } };
  worksheet.getCell("A2").font = { name: "Calibri", size: 12, color: { argb: "FF4B5563" } };
  worksheet.getCell("A3").font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF374151" } };
  worksheet.getCell("A4").font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF374151" } };
  worksheet.getCell("B3").font = { name: "Calibri", size: 12, color: { argb: "FF111827" } };
  worksheet.getCell("B4").font = { name: "Calibri", size: 12, color: { argb: "FF111827" } };

  const headerRowIndex = 6;
  worksheet.getCell(`A${headerRowIndex}`).value = "Date";
  worksheet.getCell(`B${headerRowIndex}`).value = "Description";
  worksheet.getCell(`C${headerRowIndex}`).value = "Type";
  worksheet.getCell(`D${headerRowIndex}`).value = "Amount";

  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF374151" },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE5E7EB" } },
      bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      left: { style: "thin", color: { argb: "FFE5E7EB" } },
      right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };
  });

  const dataStartRow = headerRowIndex + 1;
  params.rows.forEach((row, index) => {
    const rowNumber = dataStartRow + index;
    worksheet.getCell(`A${rowNumber}`).value = row.date;
    worksheet.getCell(`B${rowNumber}`).value = row.description;
    worksheet.getCell(`C${rowNumber}`).value = row.type;
    worksheet.getCell(`D${rowNumber}`).value = row.amount;
    worksheet.getCell(`D${rowNumber}`).numFmt = "#,##0.00";

    const excelRow = worksheet.getRow(rowNumber);
    excelRow.height = 22;
    excelRow.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11, color: { argb: "FF111827" } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };

      if (index % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF9FAFB" },
        };
      }
    });
  });

  const totalRowIndex = dataStartRow + params.rows.length + 1;
  worksheet.getCell(`C${totalRowIndex}`).value = "Total Expense";
  worksheet.getCell(`D${totalRowIndex}`).value = params.totals.expense;
  worksheet.getCell(`D${totalRowIndex}`).numFmt = "#,##0.00";

  worksheet.getCell(`C${totalRowIndex}`).font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF111827" } };
  worksheet.getCell(`D${totalRowIndex}`).font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF111827" } };
  worksheet.getCell(`C${totalRowIndex}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  };
  worksheet.getCell(`D${totalRowIndex}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  };
  worksheet.getCell(`C${totalRowIndex}`).border = {
    top: { style: "thin", color: { argb: "FFD1D5DB" } },
    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
    left: { style: "thin", color: { argb: "FFD1D5DB" } },
    right: { style: "thin", color: { argb: "FFD1D5DB" } },
  };
  worksheet.getCell(`D${totalRowIndex}`).border = {
    top: { style: "thin", color: { argb: "FFD1D5DB" } },
    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
    left: { style: "thin", color: { argb: "FFD1D5DB" } },
    right: { style: "thin", color: { argb: "FFD1D5DB" } },
  };

  worksheet.autoFilter = {
    from: `A${headerRowIndex}`,
    to: `D${headerRowIndex}`,
  };

  const bufferArray = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(bufferArray);

  return {
    fileName: params.fileName,
    buffer,
  };
}
