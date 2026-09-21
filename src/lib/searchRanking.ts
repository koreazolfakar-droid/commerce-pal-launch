import type { ShopifyProduct } from "@/lib/shopify";

type SearchField = {
  value: string;
  weight: number;
};

const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const NON_WORD = /[^\p{L}\p{N}]+/gu;

const TOKEN_ALIASES: Record<string, string[]> = {
  iphone: ["iphone", "ايفون"],
  ايفون: ["ايفون", "iphone"],
  apple: ["apple", "ابل"],
  ابل: ["ابل", "apple"],
  samsung: ["samsung", "سامسونج"],
  سامسونج: ["سامسونج", "samsung"],
  xiaomi: ["xiaomi", "شاومي"],
  شاومي: ["شاومي", "xiaomi"],
  redmi: ["redmi", "ريدمي"],
  ريدمي: ["ريدمي", "redmi"],
  poco: ["poco", "بوكو"],
  بوكو: ["بوكو", "poco"],
  honor: ["honor", "هونر"],
  هونر: ["هونر", "honor"],
  infinix: ["infinix", "انفنكس"],
  انفنكس: ["انفنكس", "infinix"],
  tecno: ["tecno", "تكنو"],
  تكنو: ["تكنو", "tecno"],
  realme: ["realme", "ريلمي"],
  ريلمي: ["ريلمي", "realme"],
  oneplus: ["oneplus", "ونبلس"],
  ونبلس: ["ونبلس", "oneplus"],
  anker: ["anker", "انكر"],
  انكر: ["انكر", "anker"],
  ugreen: ["ugreen", "يوجرين"],
  يوجرين: ["يوجرين", "ugreen"],
  smartphone: ["smartphone", "phone", "phones", "هاتف", "هواتف", "موبايل"],
  phone: ["phone", "smartphone", "هاتف", "هواتف", "موبايل"],
  phones: ["phones", "phone", "smartphone", "هواتف", "موبايل"],
  هاتف: ["هاتف", "هواتف", "phone", "smartphone"],
  هواتف: ["هواتف", "هاتف", "phones", "smartphone"],
  موبايل: ["موبايل", "phone", "smartphone"],
  charger: ["charger", "شاحن", "شواحن"],
  شاحن: ["شاحن", "charger"],
  شواحن: ["شواحن", "charger"],
  cable: ["cable", "كابل", "كيبل", "كابلات"],
  كابل: ["كابل", "cable"],
  كيبل: ["كيبل", "cable"],
  كابلات: ["كابلات", "cable"],
  earbuds: ["earbuds", "سماعات", "سماعه", "سماعة"],
  سماعات: ["سماعات", "earbuds"],
  سماعه: ["سماعه", "سماعة", "earbuds"],
  سماعة: ["سماعة", "سماعه", "earbuds"],
  watch: ["watch", "ساعه", "ساعة"],
  ساعه: ["ساعه", "watch"],
  tablet: ["tablet", "تابلت"],
  تابلت: ["تابلت", "tablet"],
  laptop: ["laptop", "لابتوب"],
  لابتوب: ["لابتوب", "laptop"],
  power: ["power", "باور"],
  باور: ["باور", "power"],
  bank: ["bank", "بانك"],
  بانك: ["بانك", "bank"],
};

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(ARABIC_MARKS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ـ/g, "")
    .toLocaleLowerCase()
    .replace(NON_WORD, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compact(value: string) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function aliasesFor(token: string) {
  return unique([token, ...(TOKEN_ALIASES[token] ?? [])].map(normalizeSearchText).filter(Boolean));
}

function editDistanceAtMost(value: string, target: string, maxDistance: number) {
  if (Math.abs(value.length - target.length) > maxDistance) return false;
  const previous = Array.from({ length: target.length + 1 }, (_, index) => index);

  for (let i = 1; i <= value.length; i += 1) {
    const current = [i];
    let rowMin = current[0];
    for (let j = 1; j <= target.length; j += 1) {
      const cost = value[i - 1] === target[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > maxDistance) return false;
    for (let j = 0; j < current.length; j += 1) previous[j] = current[j];
  }

  return previous[target.length] <= maxDistance;
}

function tokenMatchScore(queryToken: string, fieldValue: string, weight: number) {
  const normalized = normalizeSearchText(fieldValue);
  if (!normalized) return 0;

  const fieldTokens = normalized.split(" ").filter(Boolean);
  const variants = aliasesFor(queryToken);
  let best = 0;

  for (const variant of variants) {
    const numeric = /^\d+(?:gb|tb|w|g|hz|mah)?$/i.test(variant);
    for (const fieldToken of fieldTokens) {
      if (fieldToken === variant) {
        best = Math.max(best, weight + 24);
        continue;
      }

      if (!numeric && variant.length >= 4 && fieldToken.startsWith(variant)) {
        best = Math.max(best, weight + 12);
        continue;
      }

      if (!numeric && variant.length >= 5 && fieldToken.includes(variant)) {
        best = Math.max(best, weight + 4);
        continue;
      }

      if (!numeric && variant.length >= 4) {
        const allowedDistance = variant.length >= 8 ? 2 : 1;
        if (editDistanceAtMost(fieldToken, variant, allowedDistance)) {
          best = Math.max(best, weight - 8);
        }
      }
    }

    const compactField = normalized.replace(/\s+/g, "");
    const compactVariant = variant.replace(/\s+/g, "");
    if (compactVariant.length >= 4 && compactField.includes(compactVariant)) {
      best = Math.max(best, weight + 6);
    }
  }

  return best;
}

function queryTokens(term: string) {
  return unique(normalizeSearchText(term).split(" ").filter(Boolean));
}

function scoreFields(term: string, fields: SearchField[]) {
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedTerm) return 0;

  const tokens = queryTokens(normalizedTerm);
  if (!tokens.length) return 0;

  let score = 0;
  for (const token of tokens) {
    let bestForToken = 0;
    for (const field of fields) {
      bestForToken = Math.max(bestForToken, tokenMatchScore(token, field.value, field.weight));
    }
    if (bestForToken <= 0) return 0;
    score += bestForToken;
  }

  const title = normalizeSearchText(fields[0]?.value ?? "");
  if (title === normalizedTerm) score += 1200;
  else if (title.startsWith(normalizedTerm)) score += 850;
  else if (title.includes(normalizedTerm)) {
    score += 650;
    // Prefer the product whose title is closest to the searched phrase.
    // This keeps "iPhone 17 Pro Max" ahead of accessory titles such as
    // "Case for Apple iPhone 17 Pro Max" without weakening SKU/Arabic/typo matching.
    const titleTokenCount = title.split(" ").filter(Boolean).length;
    const queryTokenCount = tokens.length;
    const extraTitleTokens = Math.max(0, titleTokenCount - queryTokenCount);
    score += Math.max(0, 160 - extraTitleTokens * 30);
  } else if (compact(title).includes(compact(normalizedTerm)) && compact(normalizedTerm).length >= 4)
    score += 450;

  return score;
}

export function productSearchScore(product: ShopifyProduct, term: string) {
  const node = product.node;
  const variants = node.variants.edges.flatMap((edge) => [
    edge.node.title,
    edge.node.sku ?? "",
    edge.node.barcode ?? "",
    ...edge.node.selectedOptions.flatMap((option) => [option.name, option.value]),
  ]);

  const fields: SearchField[] = [
    { value: node.title, weight: 140 },
    { value: node.handle, weight: 90 },
    { value: node.vendor ?? "", weight: 105 },
    { value: node.productType ?? "", weight: 95 },
    ...(node.tags ?? []).map((value) => ({ value, weight: 80 })),
    ...variants.map((value) => ({ value, weight: 115 })),
    ...(node.collections?.edges ?? []).flatMap((edge) => [
      { value: edge.node.title, weight: 55 },
      { value: edge.node.handle, weight: 45 },
    ]),
    { value: node.description ?? "", weight: 24 },
  ];

  const score = scoreFields(term, fields);
  // Description-only matches are intentionally excluded. They create noisy
  // results for generic marketing copy while titles, brands, tags, variants,
  // model numbers and categories remain searchable.
  return score >= 60 ? score : 0;
}

export function matchesProductSearch(product: ShopifyProduct, term: string) {
  return productSearchScore(product, term) > 0;
}

export function textSearchScore(
  term: string,
  primary: string,
  secondary: string[] = [],
) {
  return scoreFields(term, [
    { value: primary, weight: 120 },
    ...secondary.map((value) => ({ value, weight: 55 })),
  ]);
}
