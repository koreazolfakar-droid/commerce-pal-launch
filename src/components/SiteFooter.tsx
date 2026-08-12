import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Facebook, Instagram, Youtube, Twitter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { catalogQueryOptions } from "@/lib/queries";

const SUPPORT = ["Contact", "Shipping", "Returns", "Warranty", "FAQ"];
const COMPANY = ["About", "Privacy", "Terms"];
const PAYMENTS = ["Visa", "Mastercard", "Amex", "Apple Pay", "Shop Pay"];

export function SiteFooter() {
  const { data: catalog } = useQuery(catalogQueryOptions());
  const shopLinks = (catalog?.categories ?? []).slice(0, 6);
  const brandLinks = (catalog?.brands ?? []).slice(0, 5);


  return (
    <footer className="mt-16 border-t bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                S
              </span>
              <span className="text-lg font-semibold tracking-tight">Space Cell</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Premium phones, tablets and audio — authentic stock, official warranty, secure
              checkout.
            </p>
            <form
              className="mt-5 flex max-w-sm gap-2"
              onSubmit={(event) => event.preventDefault()}
            >
              <Input type="email" placeholder="Your email" aria-label="Email address" required />
              <Button type="submit">Subscribe</Button>
            </form>
            <div className="mt-5 flex gap-3 text-muted-foreground">
              {[Instagram, Facebook, Twitter, Youtube].map((Icon, index) => (
                <span
                  key={index}
                  className="grid h-9 w-9 place-items-center rounded-md border bg-background"
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          <FooterColumn title="Shop">
            {shopLinks.length === 0 ? (
              <li className="text-sm text-muted-foreground">Collections coming soon</li>
            ) : (
              shopLinks.map((entry) => (
                <li key={entry.handle}>
                  <Link
                    to="/collections/$handle"
                    params={{ handle: entry.handle }}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {entry.label}
                  </Link>
                </li>
              ))
            )}
            <li>
              <Link to="/collections" className="text-sm text-muted-foreground hover:text-primary">
                All collections
              </Link>
            </li>
          </FooterColumn>

          <FooterColumn title="Brands">
            {brandLinks.length === 0 ? (
              <li className="text-sm text-muted-foreground">Brand pages coming soon</li>
            ) : (
              brandLinks.map((entry) => (
                <li key={entry.handle}>
                  <Link
                    to="/collections/$handle"
                    params={{ handle: entry.handle }}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {entry.label}
                  </Link>
                </li>
              ))
            )}
          </FooterColumn>

          <div className="grid gap-10 sm:grid-cols-2 lg:contents">
            <FooterColumn title="Support">
              {SUPPORT.map((item) => (
                <li key={item} className="text-sm text-muted-foreground">
                  {item}
                </li>
              ))}
            </FooterColumn>
            <FooterColumn title="Company">
              {COMPANY.map((item) => (
                <li key={item} className="text-sm text-muted-foreground">
                  {item}
                </li>
              ))}
            </FooterColumn>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Space Cell. Secure checkout powered by Shopify.</p>
          <ul className="flex flex-wrap gap-2">
            {PAYMENTS.map((payment) => (
              <li
                key={payment}
                className="rounded border bg-background px-2 py-1 text-[11px] font-medium"
              >
                {payment}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  );
}
