import { ApiError } from "@/lib/api";

export function toCsv(rows: string[][]) {
  const lines = rows.map((row) => row.map(escapeCell).join(","));
  return `\uFEFF${lines.join("\r\n")}`;
}

function escapeCell(value: string) {
  if (/[",\r\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function parseCsv(text: string) {
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n") {
      row.push(cell.trim());
      cell = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  if (rows.length === 0) throw new ApiError(400, "The CSV file is empty.");
  const [header, ...body] = rows;
  return { header, body };
}

export function headerIndex(header: string[], name: string) {
  const index = header.findIndex((column) => column.toLowerCase() === name.toLowerCase());
  if (index < 0) {
    throw new ApiError(400, `The CSV file is missing the "${name}" column.`);
  }
  return index;
}

export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
