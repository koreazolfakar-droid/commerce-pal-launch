function ProductContext({ title, vendor }: { title: string; vendor: string | null | undefined }) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {title} in Lebanon
      </h3>
      <p className="mt-3 text-sm leading-7 text-foreground/80">
        {vendor ? `${title} by ${vendor}` : title} is listed in the live Space Call catalogue for
        shoppers in Lebanon. Product options, pricing and availability are kept with the storefront
        listing so you can check the exact configuration before ordering. Review the specifications,
        selected variant and current stock status on this page, then complete checkout securely or
        contact Space Call for order support.
      </p>
    </div>
  );
}

/**
 * Public product pages intentionally avoid on-demand paid AI/web-search calls.
 * Verified copy should be added to the product catalogue/CMS during publishing,
 * where it can be reviewed once instead of creating an abuseable billing endpoint.
 */
export function OfficialProductResearch({
  title,
  vendor,
}: {
  title: string;
  vendor?: string | null;
}) {
  return (
    <section className="rounded-[1.5rem] border bg-card p-5 shadow-card sm:p-6">
      <ProductContext title={title} vendor={vendor} />
    </section>
  );
}
