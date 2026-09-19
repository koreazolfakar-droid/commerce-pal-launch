import { STORE_CONFIG, STORE_NAME } from "@/lib/storeConfig";

export const WHATSAPP_NUMBER = STORE_CONFIG.whatsappNumber;

interface WhatsAppOrder {
  title: string;
  url: string;
  quantity?: number;
  options?: Array<{ name: string; value: string }>;
  whatsappNumber?: string;
  storeName?: string;
}

function resolvedWhatsAppNumber(number?: string) {
  const digits = (number ?? "").replace(/\D/g, "");
  return digits || WHATSAPP_NUMBER;
}

export function whatsappUrl(message: string, whatsappNumber?: string) {
  return `https://wa.me/${resolvedWhatsAppNumber(whatsappNumber)}?text=${encodeURIComponent(message)}`;
}

export function productWhatsAppUrl({
  title,
  url,
  quantity = 1,
  options = [],
  whatsappNumber,
  storeName = STORE_NAME,
}: WhatsAppOrder) {
  const variant = options
    .filter((option) => option.value && option.value !== "Default Title")
    .map((option) => `${option.name}: ${option.value}`)
    .join(", ");
  const lines = [
    `Hello ${storeName}, I would like to order:`,
    title,
    variant ? `Selected options: ${variant}` : "",
    `Quantity: ${quantity}`,
    url,
  ].filter(Boolean);
  return whatsappUrl(lines.join("\n"), whatsappNumber);
}

export const generalWhatsAppUrl = (
  whatsappNumber?: string,
  storeName = STORE_NAME,
) =>
  whatsappUrl(`Hello ${storeName}, I would like help choosing a product.`, whatsappNumber);
