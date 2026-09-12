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
  const key = slug.toLowerCase();

  if (/smart.?home|home.?tech|home.?device/.test(key)) return "smart-home";
  if (/monitor|display|screen/.test(key)) return "monitors";
  if (/earbud|airpod|buds/.test(key)) return "earbuds";
  if (/headphone|headset/.test(key)) return "headphones";
  if (/speaker|audio|sound/.test(key)) return "audio";
  if (/power.?bank|battery/.test(key)) return "power-banks";
  if (/charger|charging|adapter|gan/.test(key)) return "chargers";
  if (/phone|mobile|smartphone|iphone/.test(key)) return "smartphones";
  if (/tablet|ipad/.test(key)) return "tablets";
  if (/laptop|computer|macbook|notebook/.test(key)) return "laptops";
  if (/watch|wearable/.test(key)) return "smartwatches";
  if (/gaming|playstation|console|controller|xbox/.test(key)) return "gaming";
  if (/camera|photo/.test(key)) return "cameras";
  if (/accessor|case|cover|cable|stand|holder/.test(key)) return "accessories";

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

export function CategoryGlyph({ slug, className = "", style, ...props }: Props) {
  const [column, row] = spriteCell[resolveKind(slug)];
  const x = column === 0 ? 0 : column === 6 ? 100 : (column / 6) * 100;
  const y = row * 100;

  const spriteStyle: CSSProperties = {
    backgroundImage: "url('/category-icons/category-3d-sprite.webp')",
    backgroundRepeat: "no-repeat",
    backgroundSize: "700% 200%",
    backgroundPosition: `${x}% ${y}%`,
    ...style,
  };

  return (
    <span
      aria-hidden="true"
      className={`block bg-no-repeat ${className}`}
      style={spriteStyle}
      {...props}
    />
  );
}
