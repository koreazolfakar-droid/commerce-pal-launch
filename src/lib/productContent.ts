/**
 * Parses the merchant-authored Shopify product description into readable
 * sections and a grouped specification sheet.
 *
 * Nothing here invents content: every heading, bullet, paragraph and spec row
 * comes from the product's own `descriptionHtml` / `description` field or from
 * its real Shopify variant data. When the description holds no structure the
 * result is simply a single untitled section of paragraphs.
 */

export interface SpecRow {
  label: string;
  value: string;
}

export interface ContentSection {
  title: string | null;
  paragraphs: string[];
  bullets: string[];
  specs: SpecRow[];
}

export interface SpecGroup {
  title: string;
  rows: SpecRow[];
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  deg: "°",
  times: "×",
  reg: "®",
  trade: "™",
  copy: "©",
};

function decode(value: string) {
  return value
    .replace(/&(#?\w+);/g, (match, key: string) => ENTITIES[key.toLowerCase()] ?? match)
    .replace(/\u00a0/g, " ");
}

/** Splits HTML (or plain text) into trimmed, block-level text lines. */
export function descriptionLines(html: string): string[] {
  return decode(
    html
      .replace(/<\s*(br|\/p|\/li|\/h[1-6]|\/div|\/tr)\s*\/?\s*>/gi, "\n")
      .replace(/<\/?(td|th)[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0 && line !== "-" && line !== "•");
}

const SPEC_LINE = /^([\p{L}\p{N} &/()'".+\-–]{2,40})\s*[:：]\s*(.+)$/u;
const BULLET_LINE = /^[-–—•*]\s*(.+)$/;

const KNOWN_HEADINGS = [
  "overview",
  "description",
  "key features",
  "features",
  "highlights",
  "specifications",
  "specs",
  "technical specifications",
  "what's in the box",
  "whats in the box",
  "in the box",
  "box contents",
  "warranty",
  "warranty & returns",
  "returns",
  "shipping",
  "shipping & returns",
  "compatibility",
  "why you'll love it",
];

function isHeading(line: string) {
  const normalized = line
    .toLowerCase()
    .replace(/[:：]\s*$/, "")
    .trim();
  if (KNOWN_HEADINGS.includes(normalized)) return true;
  // Short, colon-terminated, verb-less label lines act as headings too.
  return line.length <= 34 && /[:：]$/.test(line) && !SPEC_LINE.test(line.replace(/[:：]$/, ""));
}

/** Structured view of a product description. */
export function parseDescription(html?: string, plain?: string): ContentSection[] {
  const source = (html && html.trim()) || (plain && plain.trim()) || "";
  if (!source) return [];
  const lines = descriptionLines(source);
  const sections: ContentSection[] = [];
  let current: ContentSection = { title: null, paragraphs: [], bullets: [], specs: [] };

  const push = () => {
    if (current.paragraphs.length || current.bullets.length || current.specs.length) {
      sections.push(current);
    }
  };

  for (const line of lines) {
    if (isHeading(line)) {
      push();
      current = {
        title: line.replace(/[:：]\s*$/, "").trim(),
        paragraphs: [],
        bullets: [],
        specs: [],
      };
      continue;
    }
    const bullet = BULLET_LINE.exec(line);
    if (bullet?.[1]) {
      current.bullets.push(bullet[1].trim());
      continue;
    }
    const spec = SPEC_LINE.exec(line);
    if (spec?.[1] && spec[2] && spec[2].length <= 120) {
      current.specs.push({ label: spec[1].trim(), value: spec[2].trim() });
      continue;
    }
    current.paragraphs.push(line);
  }
  push();
  return sections;
}

const GROUP_RULES: Array<{ title: string; test: RegExp }> = [
  {
    title: "Display",
    test: /display|screen|resolution|refresh|nits|brightness|panel|amoled|lcd|oled|ppi/i,
  },
  {
    title: "Performance",
    test: /processor|chipset|chip|cpu|gpu|soc|snapdragon|bionic|dimensity|exynos|cores?|speed|ghz/i,
  },
  {
    title: "Memory & Storage",
    test: /\bram\b|memory|storage|capacity|\bssd\b|microsd|expandable/i,
  },
  {
    title: "Camera",
    test: /camera|lens|zoom|selfie|video record|megapixel|\bmp\b|aperture|stabilis|stabiliz|ultra-?wide|telephoto|macro|flash/i,
  },
  {
    title: "Battery & Charging",
    test: /batter|mah|charg|watt|\bw\b$|wireless power|playback|talk ?time/i,
  },
  {
    title: "Connectivity",
    test: /5g|4g|lte|wi-?fi|bluetooth|\bnfc\b|\bsim\b|usb|port|network|band|gps|uwb|jack|carrier|unlocked/i,
  },
  { title: "Audio", test: /audio|speaker|sound|noise cancel|codec|driver|microphone|\banc\b/i },
  {
    title: "Design & Build",
    test: /dimension|weight|size|material|build|colou?r|finish|water|\bip[0-9]{2}\b|thickness|frame/i,
  },
  {
    title: "Software & Features",
    test: /os|operating system|android|ios|hyperos|one ?ui|update|security|fingerprint|face|pen|assistant|ai\b/i,
  },
  {
    title: "Power & Compatibility",
    test: /compatib|input|output|voltage|cable|adapter|protocol|warranty|certif/i,
  },
];

/**
 * Groups spec rows into logical blocks. Rows that match no rule land in a final
 * "More details" group so nothing found in Shopify gets silently dropped.
 */
export function groupSpecs(rows: SpecRow[]): SpecGroup[] {
  const seen = new Set<string>();
  const unique = rows.filter((row) => {
    const key = `${row.label.toLowerCase()}|${row.value.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const groups = new Map<string, SpecRow[]>();
  const rest: SpecRow[] = [];
  for (const row of unique) {
    const rule = GROUP_RULES.find((candidate) => candidate.test.test(`${row.label} ${row.value}`));
    if (!rule) {
      rest.push(row);
      continue;
    }
    const bucket = groups.get(rule.title) ?? [];
    bucket.push(row);
    groups.set(rule.title, bucket);
  }

  const ordered: SpecGroup[] = GROUP_RULES.filter((rule) => groups.has(rule.title)).map((rule) => ({
    title: rule.title,
    rows: groups.get(rule.title) ?? [],
  }));
  if (rest.length > 0) ordered.push({ title: "More details", rows: rest });
  return ordered;
}

const SHIPPING_HEADINGS = /shipping|returns?|warranty|delivery/i;
const BOX_HEADINGS = /box/i;

/** Splits parsed sections into the tab buckets used by the product page. */
export function splitSections(sections: ContentSection[]) {
  const overview: ContentSection[] = [];
  const shipping: ContentSection[] = [];
  const box: ContentSection[] = [];
  const specs: SpecRow[] = [];

  for (const section of sections) {
    specs.push(...section.specs);
    const bare: ContentSection = { ...section, specs: [] };
    const hasProse = bare.paragraphs.length > 0 || bare.bullets.length > 0;
    if (!hasProse) continue;
    if (section.title && SHIPPING_HEADINGS.test(section.title)) shipping.push(bare);
    else if (section.title && BOX_HEADINGS.test(section.title)) box.push(bare);
    else overview.push(bare);
  }
  return { overview, shipping, box, specs };
}
