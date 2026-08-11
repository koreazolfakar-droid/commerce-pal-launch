import type { ReactNode } from "react";

import { BottomNav } from "@/components/BottomNav";
import { MobileTopBar } from "@/components/MobileTopBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

/** Shared store chrome: desktop header, mobile app bar, footer and bottom nav. */
export function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 lg:pb-0">
      <div className="hidden lg:block">
        <SiteHeader />
      </div>
      <MobileTopBar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
