import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { slug: string };

type IconKind =
  | "phone"
  | "tablet"
  | "laptop"
  | "watch"
  | "headphones"
  | "earbuds"
  | "charger"
  | "powerbank"
  | "gaming"
  | "camera"
  | "accessories"
  | "generic";

function resolveKind(slug: string): IconKind {
  const key = slug.toLowerCase();
  if (/earbud|airpod|buds/.test(key)) return "earbuds";
  if (/headphone|audio|headset/.test(key)) return "headphones";
  if (/power.?bank|battery/.test(key)) return "powerbank";
  if (/charger|charging|adapter/.test(key)) return "charger";
  if (/phone|mobile|smartphone/.test(key)) return "phone";
  if (/tablet|ipad/.test(key)) return "tablet";
  if (/laptop|computer|macbook/.test(key)) return "laptop";
  if (/watch|wearable/.test(key)) return "watch";
  if (/gaming|playstation|console|controller/.test(key)) return "gaming";
  if (/camera|photo/.test(key)) return "camera";
  if (/accessor|case|cover|cable/.test(key)) return "accessories";
  return "generic";
}

function ProductScene({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 96 96" role="img" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="sc-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.96" />
          <stop offset="0.5" stopColor="currentColor" stopOpacity="0.78" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.58" />
        </linearGradient>
        <linearGradient id="sc-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.32" stopColor="#dbeafe" stopOpacity="0.62" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0.18" />
        </linearGradient>
        <radialGradient id="sc-accent" cx="35%" cy="25%" r="80%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.88" />
          <stop offset="0.38" stopColor="#60a5fa" stopOpacity="0.7" />
          <stop offset="1" stopColor="#2563eb" stopOpacity="0.28" />
        </radialGradient>
        <filter id="sc-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#020617" floodOpacity="0.22" />
        </filter>
      </defs>
      <ellipse cx="48" cy="78" rx="26" ry="6.5" fill="currentColor" opacity="0.08" />
      <g filter="url(#sc-shadow)">{children}</g>
    </svg>
  );
}

function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <ProductScene {...props}>
      <g transform="rotate(-8 48 48)">
        <rect x="29" y="13" width="38" height="68" rx="10" fill="url(#sc-metal)" />
        <rect x="32" y="16" width="32" height="62" rx="8" fill="url(#sc-glass)" />
        <path d="M35 27c9-7 18-7 26-4v21c-9 7-17 8-26 5Z" fill="url(#sc-accent)" opacity="0.86" />
        <rect x="42" y="18.5" width="12" height="2.5" rx="1.25" fill="#0f172a" opacity="0.48" />
        <circle cx="48" cy="74.5" r="1.5" fill="#0f172a" opacity="0.5" />
        <path d="M34 19c4-3 9-4 14-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.58" />
      </g>
    </ProductScene>
  );
}

function TabletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <ProductScene {...props}>
      <g transform="rotate(5 48 48)">
        <rect x="20" y="17" width="56" height="61" rx="9" fill="url(#sc-metal)" />
        <rect x="23" y="20" width="50" height="55" rx="7" fill="url(#sc-glass)" />
        <path d="M27 25h42v23c-11 9-26 12-42 6Z" fill="url(#sc-accent)" opacity="0.74" />
        <circle cx="48" cy="72" r="1.3" fill="#0f172a" opacity="0.45" />
        <path d="M25 22c9-4 20-4 31-2" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.56" />
      </g>
    </ProductScene>
  );
}

function LaptopIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <ProductScene {...props}>
      <g>
        <rect x="22" y="18" width="52" height="38" rx="6" fill="url(#sc-metal)" />
        <rect x="25" y="21" width="46" height="32" rx="4.5" fill="url(#sc-glass)" />
        <path d="M28 25h40v18c-13 6-27 6-40 0Z" fill="url(#sc-accent)" opacity="0.72" />
        <path d="M15 61h66l-6 10H21Z" fill="url(#sc-metal)" />
        <path d="M24 63h48" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.48" />
        <rect x="42" y="63" width="12" height="2.5" rx="1.25" fill="#0f172a" opacity="0.22" />
      </g>
    </ProductScene>
  );
}

function WatchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <ProductScene {...props}>
      <path d="M39 7h18l3 19H36Z" fill="url(#sc-metal)" opacity="0.78" />
      <path d="M36 69h24l-3 20H39Z" fill="url(#sc-metal)" opacity="0.72" />
      <rect x="29" y="22" width="38" height="49" rx="13" fill="url(#sc-metal)" />
      <rect x="33" y="26" width="30" height="41" rx="10" fill="url(#sc-glass)" />
      <circle cx="48" cy="46" r="11" fill="url(#sc-accent)" opacity="0.72" />
      <path d="M48 37v9l7 5" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.58" />
      <circle cx="67.5" cy="40" r="2.3" fill="currentColor" opacity="0.6" />
    </ProductScene>
  );
}

function HeadphonesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <ProductScene {...props}>
      <path d="M25 48v-6c0-16 10-28 23-28s23 12 23 28v6" fill="none" stroke="url(#sc-metal)" strokeWidth="9" strokeLinecap="round" />
      <rect x="18" y="43" width="17" height="29" rx="8" fill="url(#sc-metal)" />
      <rect x="61" y="43" width="17" height="29" rx="8" fill="url(#sc-metal)" />
      <rect x="22" y="47" width="9" height="21" rx="4.5" fill="url(#sc-glass)" opacity="0.7" />
      <rect x="65" y="47" width="9" height="21" rx="4.5" fill="url(#sc-glass)" opacity="0.7" />
      <path d="M31 22c10-8 24-8 34 0" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.4" />
    </ProductScene>
  );
}

function EarbudsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <ProductScene {...props}>
      <rect x="23" y="47" width="50" height="28" rx="14" fill="url(#sc-metal)" />
      <rect x="26" y="50" width="44" height="22" rx="11" fill="url(#sc-glass)" opacity="0.82" />
      <g transform="rotate(-9 39 37)">
        <rect x="31" y="20" width="16" height="25" rx="8" fill="url(#sc-metal)" />
        <rect x="38" y="39" width="6" height="18" rx="3" fill="url(#sc-metal)" />
        <circle cx="39" cy="29" r="4.5" fill="url(#sc-glass)" opacity="0.8" />
      </g>
      <g transform="rotate(9 57 37)">
        <rect x="49" y="20" width="16" height="25" rx="8" fill="url(#sc-metal)" />
        <rect x="52" y="39" width="6" height="18" rx="3" fill="url(#sc-metal)" />
        <circle cx="57" cy="29" r="4.5" fill="url(#sc-glass)" opacity="0.8" />
      </g>
    </ProductScene>
  );
}

function ChargerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <ProductScene {...props}>
      <g transform="rotate(-6 48 48)">
        <rect x="27" y="27" width="42" height="42" rx="10" fill="url(#sc-metal)" />
        <rect x="31" y="31" width="34" height="34" rx="8" fill="url(#sc-glass)" opacity="0.42" />
        <path d="m51 34-12 17h10l-5 12 15-20H49Z" fill="url(#sc-accent)" />
        <rect x="36" y="14" width="6" height="16" rx="2.5" fill="url(#sc-metal)" />
        <rect x="54" y="14" width="6" height="16" rx="2.5" fill="url(#sc-metal)" />
      </g>
    </ProductScene>
  );
}

function PowerBankIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <ProductScene {...props}>
      <g transform="rotate(7 48 48)">
        <rect x="28" y="17" width="40" height="62" rx="10" fill="url(#sc-metal)" />
        <rect x="32" y="21" width="32" height="54" rx="7" fill="url(#sc-glass)" opacity="0.42" />
        <circle cx="48" cy="47" r="11" fill="url(#sc-accent)" opacity="0.76" />
        <path d="m50 35-8 13h7l-4 10 11-15h-7Z" fill="#0f172a" opacity="0.56" />
        <circle cx="61" cy="26" r="1.6" fill="#0f172a" opacity="0.4" />
      </g>
    </ProductScene>
  );
}

function GamingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <ProductScene {...props}>
      <path d="M24 35c-9 0-14 8-16 25-1 8 7 12 13 6l9-9h36l9 9c6 6 14 2 13-6-2-17-7-25-16-25-7 0-11 3-15 3H39c-4 0-8-3-15-3Z" fill="url(#sc-metal)" />
      <path d="M26 44v16M18 52h16" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <circle cx="67" cy="47" r="3.4" fill="url(#sc-accent)" />
      <circle cx="75" cy="55" r="3.4" fill="url(#sc-accent)" />
      <path d="M38 39c7 4 13 4 20 0" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.42" />
    </ProductScene>
  );
}

function CameraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <ProductScene {...props}>
      <rect x="18" y="31" width="60" height="39" rx="10" fill="url(#sc-metal)" />
      <path d="M31 31l7-12h20l7 12Z" fill="url(#sc-metal)" />
      <circle cx="48" cy="50.5" r="14" fill="url(#sc-glass)" />
      <circle cx="48" cy="50.5" r="9" fill="url(#sc-accent)" opacity="0.8" />
      <circle cx="69" cy="39" r="2.4" fill="#dbeafe" opacity="0.8" />
      <path d="M23 35c10-3 20-3 30-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.38" />
    </ProductScene>
  );
}

function AccessoriesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <ProductScene {...props}>
      <g transform="rotate(-9 39 47)">
        <rect x="23" y="18" width="30" height="57" rx="9" fill="url(#sc-metal)" />
        <rect x="26" y="21" width="24" height="51" rx="7" fill="url(#sc-glass)" opacity="0.5" />
      </g>
      <g transform="rotate(12 62 53)">
        <rect x="51" y="33" width="23" height="39" rx="7" fill="url(#sc-metal)" />
        <path d="M62 39v21" stroke="#e0f2fe" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
        <path d="M57 51h10" stroke="#e0f2fe" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
      </g>
      <circle cx="47" cy="62" r="8.5" fill="url(#sc-accent)" opacity="0.84" />
    </ProductScene>
  );
}

function GenericIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <ProductScene {...props}>
      <rect x="20" y="20" width="24" height="24" rx="8" fill="url(#sc-metal)" />
      <rect x="52" y="20" width="24" height="24" rx="8" fill="url(#sc-metal)" opacity="0.84" />
      <rect x="20" y="52" width="24" height="24" rx="8" fill="url(#sc-metal)" opacity="0.84" />
      <rect x="52" y="52" width="24" height="24" rx="8" fill="url(#sc-metal)" />
      <path d="M28 31h8M64 27v10M28 64h8M60 64h8" stroke="#dbeafe" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
    </ProductScene>
  );
}

export function CategoryGlyph({ slug, ...props }: Props) {
  switch (resolveKind(slug)) {
    case "phone": return <PhoneIcon {...props} />;
    case "tablet": return <TabletIcon {...props} />;
    case "laptop": return <LaptopIcon {...props} />;
    case "watch": return <WatchIcon {...props} />;
    case "headphones": return <HeadphonesIcon {...props} />;
    case "earbuds": return <EarbudsIcon {...props} />;
    case "charger": return <ChargerIcon {...props} />;
    case "powerbank": return <PowerBankIcon {...props} />;
    case "gaming": return <GamingIcon {...props} />;
    case "camera": return <CameraIcon {...props} />;
    case "accessories": return <AccessoriesIcon {...props} />;
    default: return <GenericIcon {...props} />;
  }
}
