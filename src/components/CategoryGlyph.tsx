import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { slug: string };

function Base({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function CategoryGlyph({ slug, ...props }: Props) {
  const key = slug.toLowerCase();

  if (/phone|mobile|smartphone/.test(key)) {
    return <Base {...props}><rect x="14" y="5.5" width="20" height="37" rx="5"/><path d="M20 10h8"/><path d="M22 37.5h4"/><path d="M18.5 14.5h11"/></Base>;
  }
  if (/tablet|ipad/.test(key)) {
    return <Base {...props}><rect x="9" y="6" width="30" height="36" rx="5"/><path d="M20 10h8"/><circle cx="24" cy="37" r="1"/></Base>;
  }
  if (/laptop|computer|macbook/.test(key)) {
    return <Base {...props}><rect x="10" y="8" width="28" height="23" rx="3"/><path d="M6 36h36"/><path d="M11 36l3-5h20l3 5"/><path d="M20 36h8"/></Base>;
  }
  if (/watch|wearable/.test(key)) {
    return <Base {...props}><rect x="15" y="13" width="18" height="22" rx="6"/><path d="M19 13l1.5-7h7L29 13"/><path d="M19 35l1.5 7h7l1.5-7"/><path d="M24 18v7l5 3"/></Base>;
  }
  if (/audio|headphone|earbud/.test(key)) {
    return <Base {...props}><path d="M10 26v-3a14 14 0 0 1 28 0v3"/><rect x="8" y="24" width="7" height="13" rx="3"/><rect x="33" y="24" width="7" height="13" rx="3"/><path d="M15 34c2 5 6 7 9 7"/></Base>;
  }
  if (/charger|charging|power/.test(key)) {
    return <Base {...props}><path d="M20 6v11"/><path d="M28 6v11"/><rect x="14" y="14" width="20" height="17" rx="4"/><path d="M24 31v11"/><path d="M20 38h8"/><path d="m25 19-5 7h5l-2 6 7-9h-5l2-4"/></Base>;
  }
  if (/case|cover/.test(key)) {
    return <Base {...props}><rect x="13" y="5.5" width="22" height="37" rx="6"/><rect x="17" y="10" width="8" height="8" rx="2"/><path d="M19 37h10"/></Base>;
  }
  if (/gaming|playstation|console/.test(key)) {
    return <Base {...props}><path d="M14 20c-5 0-7 5-8 11-.7 4 3 6 6 3l5-5h14l5 5c3 3 6.7 1 6-3-1-6-3-11-8-11Z"/><path d="M16 24v8"/><path d="M12 28h8"/><circle cx="31" cy="26" r="1.5"/><circle cx="35" cy="30" r="1.5"/></Base>;
  }
  if (/camera|photo/.test(key)) {
    return <Base {...props}><rect x="7" y="15" width="34" height="25" rx="5"/><path d="M16 15l3-6h10l3 6"/><circle cx="24" cy="27.5" r="7"/><circle cx="35" cy="20" r="1"/></Base>;
  }
  if (/accessor/.test(key)) {
    return <Base {...props}><path d="M15 11h18v26H15z"/><path d="M20 6h8"/><path d="M20 42h8"/><circle cx="24" cy="24" r="5"/><path d="M24 19v-7"/><path d="M24 36v-7"/></Base>;
  }

  return <Base {...props}><rect x="7" y="7" width="14" height="14" rx="4"/><rect x="27" y="7" width="14" height="14" rx="4"/><rect x="7" y="27" width="14" height="14" rx="4"/><rect x="27" y="27" width="14" height="14" rx="4"/><path d="M11 14h6M34 11v6M11 34h6M31 34h6"/></Base>;
}
