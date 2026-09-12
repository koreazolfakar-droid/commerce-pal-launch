import { STORE_CONFIG, STORE_NAME } from "@/lib/storeConfig";

export type InvoiceLanguage = "ar" | "en";

export type InvoiceCustomer = {
  name: string;
  phone: string;
  area: string;
  address: string;
  landmark?: string;
  notes?: string;
};

export type InvoiceLineItem = {
  title: string;
  variant?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  warranty?: string;
  imei?: string;
  serialNumber?: string;
};

export type OrderInvoiceInput = {
  invoiceNumber: string;
  orderReference: string;
  createdAt: Date;
  language: InvoiceLanguage;
  currency: string;
  total: number;
  subtotal?: number;
  discount?: number;
  deliveryFee?: number;
  tax?: number;
  customer: InvoiceCustomer;
  paymentMethod: string;
  paymentStatus: string;
  paymentTransactionId?: string;
  locationUrl?: string;
  verificationUrl?: string;
  invoiceNote?: string;
  items: InvoiceLineItem[];
};

const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const PAGE_PADDING = 82;
const FOOTER_HEIGHT = 120;
const ACCENT = "#2563eb";
const ACCENT_SOFT = "#eff6ff";
const SUCCESS = "#15803d";
const WARNING = "#b45309";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const SOFT = "#f8fafc";

function formatMoney(value: number, currency: string, language: InvoiceLanguage) {
  try {
    return new Intl.NumberFormat(language === "ar" ? "ar-LB" : "en-LB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function formatDate(date: Date, language: InvoiceLanguage) {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-LB" : "en-LB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const clean = text.trim();
  if (!clean) return [""];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = Number.POSITIVE_INFINITY,
) {
  const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return lines.length * lineHeight;
}

async function loadLogo() {
  if (typeof Image === "undefined") return null;
  return await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = "/logo.svg";
  });
}

function createPage(language: InvoiceLanguage) {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.direction = language === "ar" ? "rtl" : "ltr";
  ctx.textBaseline = "alphabetic";
  return { canvas, ctx };
}

function statusColor(status: string) {
  const normalized = status.toLowerCase();
  if (/(paid|confirmed|مدفوع|مؤكد)/.test(normalized)) return SUCCESS;
  if (/(pending|due|waiting|بانتظار|مستحق)/.test(normalized)) return WARNING;
  return ACCENT;
}

function drawStatusPill(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  align: "left" | "right",
) {
  ctx.font = "700 16px Arial, sans-serif";
  const width = Math.min(280, Math.max(150, ctx.measureText(label).width + 34));
  const left = align === "right" ? x - width : x;
  const color = statusColor(label);
  ctx.fillStyle = `${color}18`;
  ctx.fillRect(left, y, width, 38);
  ctx.strokeStyle = `${color}55`;
  ctx.strokeRect(left, y, width, 38);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(label, align === "right" ? x - 16 : x + 16, y + 25);
}

function drawCompanyHeader(
  ctx: CanvasRenderingContext2D,
  input: OrderInvoiceInput,
  logo: HTMLImageElement | null,
  compact = false,
) {
  const isArabic = input.language === "ar";
  const startX = isArabic ? PAGE_WIDTH - PAGE_PADDING : PAGE_PADDING;
  const endX = isArabic ? PAGE_PADDING : PAGE_WIDTH - PAGE_PADDING;

  if (logo) {
    const logoWidth = compact ? 154 : 190;
    const ratio = logo.naturalHeight / Math.max(1, logo.naturalWidth);
    const logoHeight = Math.min(compact ? 64 : 80, logoWidth * ratio);
    const logoX = isArabic ? PAGE_WIDTH - PAGE_PADDING - logoWidth : PAGE_PADDING;
    ctx.drawImage(logo, logoX, PAGE_PADDING - 12, logoWidth, logoHeight);
  } else {
    ctx.font = "700 32px Arial, sans-serif";
    ctx.fillStyle = TEXT;
    ctx.textAlign = isArabic ? "right" : "left";
    ctx.fillText(STORE_NAME, startX, PAGE_PADDING + 28);
  }

  ctx.textAlign = isArabic ? "left" : "right";
  ctx.fillStyle = TEXT;
  ctx.font = `800 ${compact ? 30 : 40}px Arial, sans-serif`;
  ctx.fillText(isArabic ? "فاتورة طلب" : "ORDER INVOICE", endX, PAGE_PADDING + 22);

  ctx.fillStyle = MUTED;
  ctx.font = "600 19px Arial, sans-serif";
  ctx.fillText(`${isArabic ? "رقم الفاتورة" : "Invoice"}: ${input.invoiceNumber}`, endX, PAGE_PADDING + 58);
  ctx.fillText(`${isArabic ? "رقم الطلب" : "Order"}: ${input.orderReference}`, endX, PAGE_PADDING + 88);
  if (!compact) {
    ctx.fillText(`${isArabic ? "التاريخ" : "Date"}: ${formatDate(input.createdAt, input.language)}`, endX, PAGE_PADDING + 118);
  }

  const infoX = isArabic ? PAGE_WIDTH - PAGE_PADDING : PAGE_PADDING;
  const companyLines = [
    STORE_CONFIG.invoiceLegalName || STORE_NAME,
    STORE_CONFIG.invoiceAddress,
    STORE_CONFIG.invoicePhone ? `${isArabic ? "هاتف" : "Phone"}: ${STORE_CONFIG.invoicePhone}` : "",
    STORE_CONFIG.invoiceEmail ? `${isArabic ? "بريد" : "Email"}: ${STORE_CONFIG.invoiceEmail}` : "",
    STORE_CONFIG.siteUrl,
  ].filter(Boolean);

  ctx.textAlign = isArabic ? "right" : "left";
  ctx.font = "500 18px Arial, sans-serif";
  ctx.fillStyle = MUTED;
  const companyY = PAGE_PADDING + (compact ? 86 : 118);
  companyLines.slice(compact ? 2 : 1).forEach((line, index) => {
    ctx.fillText(line, infoX, companyY + index * 27);
  });

  const dividerY = compact ? 220 : 270;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAGE_PADDING, dividerY);
  ctx.lineTo(PAGE_WIDTH - PAGE_PADDING, dividerY);
  ctx.stroke();
  return dividerY + 36;
}

function drawInfoCard(ctx: CanvasRenderingContext2D, input: OrderInvoiceInput, y: number) {
  const isArabic = input.language === "ar";
  const cardHeight = input.locationUrl || input.paymentTransactionId ? 300 : 260;
  ctx.fillStyle = SOFT;
  ctx.fillRect(PAGE_PADDING, y, PAGE_WIDTH - PAGE_PADDING * 2, cardHeight);
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(PAGE_PADDING, y, PAGE_WIDTH - PAGE_PADDING * 2, cardHeight);

  const colWidth = (PAGE_WIDTH - PAGE_PADDING * 2 - 76) / 2;
  const leftX = PAGE_PADDING + 30;
  const rightX = PAGE_PADDING + 46 + colWidth;
  const customerX = isArabic ? leftX + colWidth : leftX;
  const paymentX = isArabic ? rightX + colWidth : rightX;

  ctx.fillStyle = TEXT;
  ctx.font = "800 22px Arial, sans-serif";
  ctx.textAlign = isArabic ? "right" : "left";
  ctx.fillText(isArabic ? "بيانات الزبون" : "Customer details", customerX, y + 38);
  ctx.fillText(isArabic ? "الدفع" : "Payment", paymentX, y + 38);

  ctx.fillStyle = MUTED;
  ctx.font = "500 18px Arial, sans-serif";
  const customerLines = [
    `${isArabic ? "الاسم" : "Name"}: ${input.customer.name}`,
    `${isArabic ? "الهاتف" : "Phone"}: ${input.customer.phone}`,
    `${isArabic ? "المنطقة" : "Area"}: ${input.customer.area}`,
    `${isArabic ? "العنوان" : "Address"}: ${input.customer.address}`,
    input.customer.landmark ? `${isArabic ? "نقطة دالة" : "Landmark"}: ${input.customer.landmark}` : "",
    input.locationUrl ? `${isArabic ? "الموقع" : "Location"}: ${input.locationUrl}` : "",
  ].filter(Boolean);

  let customerY = y + 74;
  customerLines.forEach((line) => {
    const used = drawWrappedText(ctx, line, customerX, customerY, colWidth, 25, 2);
    customerY += Math.max(used, 25) + 6;
  });

  const paymentLines = [
    `${isArabic ? "الطريقة" : "Method"}: ${input.paymentMethod}`,
    input.paymentTransactionId
      ? `${isArabic ? "رقم العملية" : "Transaction"}: ${input.paymentTransactionId}`
      : "",
  ].filter(Boolean);

  let paymentY = y + 74;
  paymentLines.forEach((line) => {
    const used = drawWrappedText(ctx, line, paymentX, paymentY, colWidth, 25, 2);
    paymentY += Math.max(used, 25) + 10;
  });

  drawStatusPill(
    ctx,
    input.paymentStatus,
    isArabic ? paymentX : rightX,
    Math.min(y + cardHeight - 62, paymentY + 4),
    isArabic ? "right" : "left",
  );

  return y + cardHeight + 36;
}

function drawTableHeader(ctx: CanvasRenderingContext2D, language: InvoiceLanguage, y: number) {
  const isArabic = language === "ar";
  const tableWidth = PAGE_WIDTH - PAGE_PADDING * 2;
  ctx.fillStyle = TEXT;
  ctx.fillRect(PAGE_PADDING, y, tableWidth, 56);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 17px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(isArabic ? "المنتج" : "Product", PAGE_PADDING + 20, y + 36);
  ctx.fillText(isArabic ? "التفاصيل" : "Details", PAGE_PADDING + 500, y + 36);
  ctx.textAlign = "center";
  ctx.fillText(isArabic ? "الكمية" : "Qty", PAGE_PADDING + 805, y + 36);
  ctx.textAlign = "right";
  ctx.fillText(isArabic ? "السعر" : "Unit", PAGE_PADDING + 955, y + 36);
  ctx.fillText(isArabic ? "الإجمالي" : "Total", PAGE_WIDTH - PAGE_PADDING - 18, y + 36);
  return y + 56;
}

function rowHeight(ctx: CanvasRenderingContext2D, item: InvoiceLineItem) {
  ctx.font = "700 18px Arial, sans-serif";
  const titleLines = Math.min(2, wrapText(ctx, item.title, 430).length);
  ctx.font = "500 16px Arial, sans-serif";
  const detailText = [item.variant, item.warranty, item.imei, item.serialNumber].filter(Boolean).join(" • ");
  const detailLines = Math.min(4, wrapText(ctx, detailText || "—", 280).length);
  return Math.max(86, Math.max(titleLines, detailLines) * 24 + 36);
}

function drawItemRow(ctx: CanvasRenderingContext2D, input: OrderInvoiceInput, item: InvoiceLineItem, y: number) {
  const height = rowHeight(ctx, item);
  const bottom = y + height;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(PAGE_PADDING, y, PAGE_WIDTH - PAGE_PADDING * 2, height);

  ctx.fillStyle = TEXT;
  ctx.font = "700 18px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.direction = input.language === "ar" ? "rtl" : "ltr";
  drawWrappedText(ctx, item.title, PAGE_PADDING + 20, y + 32, 430, 25, 2);

  const isArabic = input.language === "ar";
  const details = [
    item.variant || "",
    item.warranty ? `${isArabic ? "ضمان" : "Warranty"}: ${item.warranty}` : "",
    item.imei ? `IMEI: ${item.imei}` : "",
    item.serialNumber ? `${isArabic ? "سيريال" : "Serial"}: ${item.serialNumber}` : "",
  ].filter(Boolean);

  ctx.fillStyle = MUTED;
  ctx.font = "500 16px Arial, sans-serif";
  drawWrappedText(ctx, details.join(" • ") || "—", PAGE_PADDING + 500, y + 32, 280, 24, 4);

  ctx.direction = "ltr";
  ctx.fillStyle = TEXT;
  ctx.font = "700 17px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(item.quantity), PAGE_PADDING + 805, y + 32);
  ctx.textAlign = "right";
  ctx.fillText(formatMoney(item.unitPrice, input.currency, input.language), PAGE_PADDING + 955, y + 32);
  ctx.font = "800 18px Arial, sans-serif";
  ctx.fillText(formatMoney(item.lineTotal, input.currency, input.language), PAGE_WIDTH - PAGE_PADDING - 18, y + 32);
  ctx.direction = input.language === "ar" ? "rtl" : "ltr";
  return bottom;
}

function calculatedSubtotal(input: OrderInvoiceInput) {
  return input.subtotal ?? input.items.reduce((sum, item) => sum + item.lineTotal, 0);
}

function drawTotalsAndNotes(ctx: CanvasRenderingContext2D, input: OrderInvoiceInput, y: number) {
  const isArabic = input.language === "ar";
  const right = PAGE_WIDTH - PAGE_PADDING;
  const left = PAGE_PADDING;
  const subtotal = calculatedSubtotal(input);
  const rows = [
    [isArabic ? "المجموع الفرعي" : "Subtotal", subtotal],
    input.discount ? [isArabic ? "الخصم" : "Discount", -Math.abs(input.discount)] : null,
    input.deliveryFee ? [isArabic ? "التوصيل" : "Delivery", input.deliveryFee] : null,
    input.tax ? [isArabic ? "الضريبة" : "Tax", input.tax] : null,
  ].filter(Boolean) as Array<[string, number]>;

  const boxHeight = 92 + rows.length * 34;
  ctx.fillStyle = ACCENT_SOFT;
  ctx.fillRect(left, y, PAGE_WIDTH - PAGE_PADDING * 2, boxHeight);
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(left, y, PAGE_WIDTH - PAGE_PADDING * 2, boxHeight);

  ctx.font = "600 17px Arial, sans-serif";
  rows.forEach(([label, value], index) => {
    const rowY = y + 32 + index * 34;
    ctx.fillStyle = MUTED;
    ctx.textAlign = isArabic ? "right" : "left";
    ctx.fillText(label, isArabic ? right - 28 : left + 28, rowY);
    ctx.fillStyle = TEXT;
    ctx.textAlign = isArabic ? "left" : "right";
    ctx.direction = "ltr";
    ctx.fillText(formatMoney(value, input.currency, input.language), isArabic ? left + 28 : right - 28, rowY);
    ctx.direction = isArabic ? "rtl" : "ltr";
  });

  const totalY = y + boxHeight - 26;
  ctx.fillStyle = TEXT;
  ctx.font = "800 21px Arial, sans-serif";
  ctx.textAlign = isArabic ? "right" : "left";
  ctx.fillText(isArabic ? "الإجمالي النهائي" : "Grand total", isArabic ? right - 28 : left + 28, totalY);
  ctx.fillStyle = ACCENT;
  ctx.font = "900 32px Arial, sans-serif";
  ctx.textAlign = isArabic ? "left" : "right";
  ctx.direction = "ltr";
  ctx.fillText(formatMoney(input.total, input.currency, input.language), isArabic ? left + 28 : right - 28, totalY);
  ctx.direction = isArabic ? "rtl" : "ltr";

  let nextY = y + boxHeight + 34;
  const notes = [
    input.customer.notes ? `${isArabic ? "ملاحظات الطلب" : "Order notes"}: ${input.customer.notes}` : "",
    input.invoiceNote || "",
    input.verificationUrl
      ? `${isArabic ? "تحقق من الفاتورة" : "Verify invoice"}: ${input.verificationUrl}`
      : "",
  ].filter(Boolean);

  if (notes.length) {
    ctx.fillStyle = TEXT;
    ctx.font = "800 19px Arial, sans-serif";
    ctx.textAlign = isArabic ? "right" : "left";
    const x = isArabic ? right : left;
    ctx.fillText(isArabic ? "معلومات إضافية" : "Additional information", x, nextY);
    ctx.fillStyle = MUTED;
    ctx.font = "500 16px Arial, sans-serif";
    nextY += 30;
    for (const note of notes) {
      nextY += drawWrappedText(ctx, note, x, nextY, PAGE_WIDTH - PAGE_PADDING * 2, 23, 4) + 10;
    }
  }

  ctx.fillStyle = MUTED;
  ctx.font = "500 15px Arial, sans-serif";
  ctx.textAlign = isArabic ? "right" : "left";
  const disclaimer = isArabic
    ? "هذه فاتورة طلب مولّدة من بيانات الزبون. لا تُعد إيصالًا ضريبيًا أو إثبات دفع ما لم يذكر خلاف ذلك."
    : "This order invoice is generated from the customer's order details. It is not a tax receipt or proof of payment unless explicitly stated otherwise.";
  drawWrappedText(ctx, disclaimer, isArabic ? right : left, nextY, PAGE_WIDTH - PAGE_PADDING * 2, 22, 3);
}

function drawFooter(ctx: CanvasRenderingContext2D, input: OrderInvoiceInput, page: number, totalPages: number) {
  const isArabic = input.language === "ar";
  const y = PAGE_HEIGHT - 58;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAGE_PADDING, PAGE_HEIGHT - FOOTER_HEIGHT + 12);
  ctx.lineTo(PAGE_WIDTH - PAGE_PADDING, PAGE_HEIGHT - FOOTER_HEIGHT + 12);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.font = "500 14px Arial, sans-serif";
  ctx.textAlign = isArabic ? "right" : "left";
  ctx.fillText(STORE_CONFIG.siteUrl, isArabic ? PAGE_WIDTH - PAGE_PADDING : PAGE_PADDING, y);
  ctx.textAlign = isArabic ? "left" : "right";
  ctx.fillText(`${isArabic ? "صفحة" : "Page"} ${page}/${totalPages}`, isArabic ? PAGE_PADDING : PAGE_WIDTH - PAGE_PADDING, y);
}

function decodeDataUrl(dataUrl: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function buildImagePdf(images: Uint8Array[]) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let length = 0;

  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: Array<string | Uint8Array>) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    body.forEach(push);
    push("\nendobj\n");
  };

  push("%PDF-1.4\n% Space Call invoice\n");
  object(1, ["<</Type /Catalog /Pages 2 0 R>>"]);

  const pageIds = images.map((_, index) => 3 + index * 3);
  object(2, [`<</Type /Pages /Count ${images.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}]>>`]);

  images.forEach((jpeg, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    object(imageId, [
      `<</Type /XObject /Subtype /Image /Width ${PAGE_WIDTH} /Height ${PAGE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length}>>\nstream\n`,
      jpeg,
      "\nendstream",
    ]);
    const content = `q\n595 0 0 842 0 0 cm\n/Im${index} Do\nQ`;
    object(contentId, [`<</Length ${content.length}>>\nstream\n${content}\nendstream`]);
    object(pageId, [
      `<</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources <</XObject <</Im${index} ${imageId} 0 R>>>> /Contents ${contentId} 0 R>>`,
    ]);
  });

  const xrefOffset = length;
  const maxId = 2 + images.length * 3;
  push(`xref\n0 ${maxId + 1}\n`);
  push("0000000000 65535 f \n");
  for (let id = 1; id <= maxId; id += 1) {
    push(`${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<</Size ${maxId + 1} /Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(chunks, { type: "application/pdf" });
}

export async function createOrderInvoicePdfBlob(input: OrderInvoiceInput) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    throw new Error("Invoice generation is only available in the browser.");
  }

  await document.fonts?.ready;
  const logo = await loadLogo();
  const pages: HTMLCanvasElement[] = [];
  let page = createPage(input.language);
  let y = drawCompanyHeader(page.ctx, input, logo, false);
  y = drawInfoCard(page.ctx, input, y);
  y = drawTableHeader(page.ctx, input.language, y);

  for (const item of input.items) {
    const height = rowHeight(page.ctx, item);
    if (y + height > PAGE_HEIGHT - FOOTER_HEIGHT - 260) {
      pages.push(page.canvas);
      page = createPage(input.language);
      y = drawCompanyHeader(page.ctx, input, logo, true);
      y = drawTableHeader(page.ctx, input.language, y);
    }
    y = drawItemRow(page.ctx, input, item, y);
  }

  if (y + 360 > PAGE_HEIGHT - FOOTER_HEIGHT) {
    pages.push(page.canvas);
    page = createPage(input.language);
    y = drawCompanyHeader(page.ctx, input, logo, true);
  } else {
    y += 34;
  }
  drawTotalsAndNotes(page.ctx, input, y);
  pages.push(page.canvas);

  pages.forEach((canvas, index) => {
    const ctx = canvas.getContext("2d");
    if (ctx) drawFooter(ctx, input, index + 1, pages.length);
  });

  const jpegPages = pages.map((canvas) => decodeDataUrl(canvas.toDataURL("image/jpeg", 0.94)));
  return buildImagePdf(jpegPages);
}

export async function downloadOrderInvoicePdf(input: OrderInvoiceInput) {
  const pdf = await createOrderInvoicePdfBlob(input);
  const url = URL.createObjectURL(pdf);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${STORE_NAME.replace(/\s+/g, "-")}-Invoice-${input.invoiceNumber}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
