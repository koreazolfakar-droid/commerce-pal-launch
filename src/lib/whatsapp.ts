import { STORE_CONFIG, STORE_NAME } from "@/lib/storeConfig";

export const WHATSAPP_NUMBER = STORE_CONFIG.whatsappNumber;

interface WhatsAppOrder {
  title: string;
  url: string;
  price?: string;
  quantity?: number;
  options?: Array<{ name: string; value: string }>;
}

export function whatsappUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function productWhatsAppUrl({
  title,
  url,
  price,
  quantity = 1,
  options = [],
}: WhatsAppOrder) {
  const selected = options
    .filter((option) => option.value && option.value !== "Default Title")
    .map((option) => `${option.name}: ${option.value}`);
  const lines = [
    `Hello ${STORE_NAME},`,
    "",
    "I'm interested in:",
    "",
    title,
    ...selected,
    quantity > 1 ? `Quantity: ${quantity}` : "",
    price ? `Price: ${price}` : "",
    "",
    "Product:",
    url,
  ].filter((line) => line !== "");
  return whatsappUrl(lines.join("\n"));
}

export const generalWhatsAppUrl = () =>
  whatsappUrl(`Hello ${STORE_NAME}, I would like help choosing a product.`);
