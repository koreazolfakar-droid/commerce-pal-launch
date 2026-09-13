import type { CSSProperties, HTMLAttributes } from "react";

type Props = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & { slug: string };

type IconKind =
  | "smartphones"
  | "tablets"
  | "laptops"
  | "smartwatches"
  | "earbuds"
  | "headphones"
  | "chargers"
  | "power-banks"
  | "gaming"
  | "accessories"
  | "cameras"
  | "audio"
  | "smart-home"
  | "monitors";

function resolveKind(slug: string): IconKind {
  const key = slug.toLowerCase().replace(/[_\s]+/g, "-");

  // Match the most specific accessory/product families before broad device words.
  if (/smart-?home|home-?tech|home-?device/.test(key)) return "smart-home";
  if (/monitor|display|screen|television|\btv\b/.test(key)) return "monitors";
  if (/earbud|earphone|airpod|\bbuds?\b/.test(key)) return "earbuds";
  if (/headphone|headset/.test(key)) return "headphones";
  if (/speaker|audio|sound/.test(key)) return "audio";
  if (/power-?bank|portable-?battery|battery-?pack/.test(key)) return "power-banks";
  if (/charger|charging|adapter|gan|wall-?plug/.test(key)) return "chargers";
  if (/gaming|playstation|console|controller|xbox/.test(key)) return "gaming";
  if (/camera|photo|gimbal/.test(key)) return "cameras";

  // Keep compound slugs such as mobile-accessories/tablet-accessories from
  // being mistaken for the parent device category.
  if (/accessor|case|cover|cable|stand|holder|keyboard|mouse|stylus|protector|mount/.test(key)) {
    return "accessories";
  }

  if (/watch|wearable/.test(key)) return "smartwatches";
  if (/tablet|ipad/.test(key)) return "tablets";
  if (/laptop|computer|macbook|notebook/.test(key)) return "laptops";
  if (/phone|mobile|smartphone|iphone/.test(key)) return "smartphones";

  return "accessories";
}

const spriteCell: Record<IconKind, [number, number]> = {
  smartphones: [0, 0],
  tablets: [1, 0],
  laptops: [2, 0],
  smartwatches: [3, 0],
  earbuds: [4, 0],
  headphones: [5, 0],
  chargers: [6, 0],
  "power-banks": [0, 1],
  gaming: [1, 1],
  accessories: [2, 1],
  cameras: [3, 1],
  audio: [4, 1],
  "smart-home": [5, 1],
  monitors: [6, 1],
};

const COLUMN_POSITION = [0, 100 / 6, 200 / 6, 300 / 6, 400 / 6, 500 / 6, 100] as const;

export function CategoryGlyph({ slug, className = "", style, ...props }: Props) {
  const [column, row] = spriteCell[resolveKind(slug)];

  const spriteStyle: CSSProperties = {
    backgroundImage: "url('/category-icons/category-3d-sprite.webp')",
    backgroundRepeat: "no-repeat",
    backgroundSize: "700% 200%",
    backgroundPosition: `${COLUMN_POSITION[column]}% ${row * 100}%`,
    ...style,
  };

  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 bg-no-repeat ${className}`}
      style={spriteStyle}
      {...props}
    />
  );
}
