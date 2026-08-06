import { format } from "date-fns";
import type { Invoice, InvoiceItem } from "./types";

/**
 * The invoice is drawn onto a canvas and embedded into the PDF as an image
 * rather than laid out with PDF text operators. School names are Chinese, and
 * embedding a CJK font would add megabytes to the bundle; the browser already
 * has the fonts, so rasterising is both smaller and more reliable.
 */

// A4 at ~150dpi. Keeps the attachment small while staying crisp in print.
const W = 1240;
const H = 1754;
const M = 96; // page margin

const BILL_TO = [
  "Becky Wong",
  "Index Academy Limited",
  "Room 03, 20/f, New Trend Centre, 704",
  "Prince Edward Road East, Kowloon",
];

const FONT_STACK =
  '"Helvetica Neue", Helvetica, Arial, "PingFang HK", "Microsoft JhengHei", "Noto Sans CJK HK", sans-serif';

function font(size: number, weight: "normal" | "bold" = "normal"): string {
  return `${weight} ${size}px ${FONT_STACK}`;
}

/** Trim text to fit a column, appending an ellipsis when it overflows. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(out + "…").width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + "…";
}

function money(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return `$${rounded.toLocaleString("en-US", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function toJsDate(value: InvoiceItem["startAt"]): Date {
  return value instanceof Date ? value : value.toDate();
}

export interface InvoiceDraft {
  userName: string;
  month: string; // "YYYY-MM"
  items: InvoiceItem[];
  total: number;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  submittedAt?: Date;
}

export function draftFromInvoice(invoice: Invoice): InvoiceDraft {
  return {
    userName: invoice.userName,
    month: invoice.month,
    items: invoice.items,
    total: invoice.total,
    bankName: invoice.bankName,
    bankAccount: invoice.bankAccount,
    bankAccountName: invoice.bankAccountName,
    submittedAt:
      invoice.submittedAt instanceof Date
        ? invoice.submittedAt
        : invoice.submittedAt?.toDate?.(),
  };
}

/** Draws the invoice and returns the canvas. Exported for previewing. */
export function renderInvoiceCanvas(draft: InvoiceDraft): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  // ---- Title
  ctx.fillStyle = "#000000";
  ctx.font = font(72, "bold");
  ctx.fillText("INVOICE", M, M + 60);

  // ---- Bill To (left) / Date (right)
  let y = M + 150;
  ctx.font = font(22);
  ctx.fillStyle = "#111111";
  ctx.fillText("Bill To:", M, y);
  y += 34;
  for (const line of BILL_TO) {
    ctx.fillText(line, M, y);
    y += 34;
  }

  const dateX = W / 2 + 60;
  ctx.fillText("Date:", dateX, M + 150);
  const submitted = draft.submittedAt ?? new Date();
  ctx.font = font(22);
  ctx.fillText(format(submitted, "d MMM yyyy"), dateX, M + 150 + 40);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(dateX, M + 150 + 52);
  ctx.lineTo(W - M, M + 150 + 52);
  ctx.stroke();

  // ---- Month heading, e.g. "Jul"
  const monthDate = new Date(`${draft.month}-01T00:00:00`);
  ctx.font = font(56);
  ctx.fillStyle = "#000000";
  ctx.fillText(format(monthDate, "MMM"), M, y + 90);

  // ---- Table
  const tableTop = y + 140;
  const tableW = W - M * 2;
  const cols = [
    { key: "date", label: "Date", w: 0.13 },
    { key: "school", label: "School Name", w: 0.31 },
    { key: "course", label: "Course Name", w: 0.24 },
    { key: "time", label: "Time", w: 0.19 },
    { key: "price", label: "Price", w: 0.13 },
  ];
  const xs: number[] = [];
  let acc = M;
  for (const c of cols) {
    xs.push(acc);
    acc += c.w * tableW;
  }
  xs.push(M + tableW);

  const headH = 56;
  const rowH = 52;
  // Match the template's fixed 7-row body, growing only if there are more.
  const bodyRows = Math.max(7, draft.items.length);

  // Header band
  ctx.fillStyle = "#efedec";
  ctx.fillRect(M, tableTop, tableW, headH);

  ctx.fillStyle = "#000000";
  ctx.font = font(20);
  ctx.textAlign = "center";
  cols.forEach((c, i) => {
    ctx.fillText(c.label, (xs[i] + xs[i + 1]) / 2, tableTop + headH / 2 + 7);
  });

  // Grid
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  const tableBottom = tableTop + headH + bodyRows * rowH;
  for (let r = 0; r <= bodyRows + 1; r++) {
    const ry = r === 0 ? tableTop : tableTop + headH + (r - 1) * rowH;
    ctx.beginPath();
    ctx.moveTo(M, ry);
    ctx.lineTo(M + tableW, ry);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(M, tableBottom);
  ctx.lineTo(M + tableW, tableBottom);
  ctx.stroke();
  for (const x of xs) {
    ctx.beginPath();
    ctx.moveTo(x, tableTop);
    ctx.lineTo(x, tableBottom);
    ctx.stroke();
  }

  // Rows
  const sorted = [...draft.items].sort(
    (a, b) => toJsDate(a.startAt).getTime() - toJsDate(b.startAt).getTime(),
  );
  sorted.forEach((item, i) => {
    const ry = tableTop + headH + i * rowH + rowH / 2 + 7;
    const start = toJsDate(item.startAt);
    const pad = 14;

    ctx.font = font(19);
    ctx.fillStyle = "#000000";

    ctx.textAlign = "center";
    ctx.fillText(format(start, "d MMM"), (xs[0] + xs[1]) / 2, ry);

    ctx.textAlign = "left";
    ctx.fillText(
      fit(ctx, item.schoolName, xs[2] - xs[1] - pad * 2),
      xs[1] + pad,
      ry,
    );
    ctx.fillText(
      fit(ctx, item.courseName, xs[3] - xs[2] - pad * 2),
      xs[2] + pad,
      ry,
    );

    ctx.textAlign = "center";
    const timeLabel =
      item.rateUnit === "daily" ? "1 day" : `${item.hours} hr`;
    ctx.fillText(timeLabel, (xs[3] + xs[4]) / 2, ry);

    ctx.font = font(19, "bold");
    ctx.fillText(money(item.amount), (xs[4] + xs[5]) / 2, ry);
  });

  ctx.textAlign = "left";

  // ---- Thank you
  const footY = tableBottom + 130;
  ctx.fillStyle = "#000000";
  ctx.font = font(52, "bold");
  ctx.fillText("THANK YOU!", M, footY);

  // ---- Bank details
  ctx.font = font(22);
  let by = footY + 76;
  for (const line of [
    `Bank Name: ${draft.bankName}`,
    `Account Number: ${draft.bankAccount}`,
    `Name: ${draft.bankAccountName}`,
  ]) {
    ctx.fillText(fit(ctx, line, tableW * 0.5), M, by);
    by += 36;
  }

  // ---- Total box
  const boxW = tableW * 0.46;
  const boxH = 64;
  const boxX = M + tableW - boxW;
  const boxY = footY + 74;
  ctx.fillStyle = "#efedec";
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = "#000000";
  ctx.font = font(24);
  ctx.fillText("Total:", boxX + 16, boxY + boxH / 2 + 8);
  ctx.font = font(26, "bold");
  ctx.textAlign = "right";
  ctx.fillText(money(draft.total), boxX + boxW - 16, boxY + boxH / 2 + 8);
  ctx.textAlign = "left";

  // ---- Who submitted it (not on the template, but invoices arrive by email
  // from a shared sender — the recipient needs to know whose invoice this is)
  ctx.font = font(18);
  ctx.fillStyle = "#666666";
  ctx.fillText(`Submitted by ${draft.userName}`, M, H - M + 20);

  return canvas;
}

/** Renders the invoice and returns the PDF as a base64 string (no data: prefix). */
export async function buildInvoicePdfBase64(draft: InvoiceDraft): Promise<string> {
  const canvas = renderInvoiceCanvas(draft);
  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH);

  const uri = pdf.output("datauristring");
  return uri.slice(uri.indexOf(",") + 1);
}

export function invoiceFileName(draft: InvoiceDraft): string {
  const safeName = draft.userName.replace(/[^\w一-鿿-]+/g, "_");
  return `Invoice_${draft.month}_${safeName || "tutor"}.pdf`;
}

/** Triggers a local download so the freelancer keeps their own copy. */
export async function downloadInvoicePdf(draft: InvoiceDraft): Promise<void> {
  const base64 = await buildInvoicePdfBase64(draft);
  const link = document.createElement("a");
  link.href = `data:application/pdf;base64,${base64}`;
  link.download = invoiceFileName(draft);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
