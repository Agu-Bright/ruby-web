/**
 * Generic Excel-export utility for admin list pages.
 *
 * Uses SheetJS (`xlsx`) to build a real .xlsx file in the browser and
 * triggers a download. Kept dependency-free apart from `xlsx` itself
 * so every list page can wire an "Export Excel" button with a small
 * column config — no schema-per-page boilerplate.
 *
 * The column config is deliberately narrow: each column has a `header`
 * (shown in row 1) and a `value(row)` accessor that returns the cell.
 * Accessors do their own formatting (dates, currency, populated-object
 * unwrapping via the shared `lib/utils` helpers), so the utility
 * doesn't need to know about the data shape.
 *
 * Downloads use `writeFile` which triggers a browser file save without
 * needing us to construct a Blob/URL manually — SheetJS handles the
 * cross-browser plumbing.
 */
import * as XLSX from 'xlsx';

export interface ExcelColumn<T> {
  /** Header text shown in row 1. Keep short — Excel column widths are
   *  computed from the longer of header/values, and long headers waste
   *  screen space in the resulting sheet. */
  header: string;
  /** Cell accessor. Return a string/number/boolean/null. Undefined and
   *  null both render as blank cells. Format currency, dates, arrays,
   *  etc. inside the accessor so the caller controls presentation. */
  value: (row: T) => string | number | boolean | null | undefined;
  /** Optional column width in characters. If omitted, we compute a
   *  reasonable width from the header + a sample of values (capped at
   *  60 chars to prevent runaway long columns). */
  width?: number;
}

export interface ExportToExcelOptions<T> {
  /** Filename WITHOUT extension. `.xlsx` is appended automatically.
   *  The utility also appends a timestamp so repeated exports don't
   *  overwrite each other in the user's Downloads folder. */
  filename: string;
  /** Sheet tab name shown at the bottom of the workbook. Max 31 chars
   *  (Excel limit); longer names are truncated. */
  sheetName: string;
  /** Column definitions, in the order they should appear. */
  columns: ExcelColumn<T>[];
  /** The rows to export. Empty arrays still write a valid file with
   *  just the header row — callers can decide whether to guard against
   *  that or let the user get an "empty" export. */
  rows: T[];
}

/**
 * Build a workbook from the column config + rows and trigger a browser
 * download. Runs entirely client-side; no server round-trip.
 *
 * Called from list pages like businesses and customers — see
 * `src/app/ruby-app/admin/(dashboard)/businesses/page.tsx` and
 * `.../customers/page.tsx` for wiring examples.
 */
export function exportToExcel<T>({
  filename,
  sheetName,
  columns,
  rows,
}: ExportToExcelOptions<T>): void {
  // Row 1 = headers; subsequent rows = values from column accessors.
  // We build a 2D array (AOA) rather than an array-of-objects so SheetJS
  // preserves our column order exactly — object-key ordering isn't
  // guaranteed across all runtimes.
  const headerRow = columns.map((c) => c.header);
  const dataRows: (string | number | boolean | null | undefined)[][] = rows.map(
    (row) => columns.map((c) => normaliseCell(c.value(row))),
  );
  const aoa = [headerRow, ...dataRows];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths — cap the auto-size at 60 chars so a single long
  // description doesn't push every other column off-screen. Callers
  // that want exact widths can set `column.width` explicitly.
  worksheet['!cols'] = columns.map((c, colIdx) => {
    if (typeof c.width === 'number') return { wch: c.width };
    const sample = dataRows.slice(0, 100).map((r) => r[colIdx]);
    const maxCellLen = Math.max(
      c.header.length,
      ...sample.map((v) => (v == null ? 0 : String(v).length)),
    );
    return { wch: Math.min(Math.max(maxCellLen + 2, 10), 60) };
  });

  const workbook = XLSX.utils.book_new();
  // Excel sheet-name limit is 31 chars; truncate silently.
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19); // 2026-07-08T14-32-01
  XLSX.writeFile(workbook, `${filename}-${stamp}.xlsx`);
}

/**
 * Convert `undefined` → `null` so SheetJS writes a blank cell rather
 * than "undefined". Preserves 0 and false correctly. Also flattens
 * objects/arrays via JSON so an accidental populated-object accessor
 * doesn't crash the export — but callers should format properly.
 */
function normaliseCell(
  v: string | number | boolean | null | undefined,
): string | number | boolean | null {
  if (v === undefined) return null;
  if (v === null) return null;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return v;
  }
  // Defensive — if a caller returns an object by mistake, stringify it
  // so the export doesn't blow up. Callers should format before
  // returning; this is a safety net, not an intended path.
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
