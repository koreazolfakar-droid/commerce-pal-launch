const image = (label) => ({
  url: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><text x="300" y="300" text-anchor="middle">${label}</text></svg>`)}`,
  altText: label,
});
const vendors = ["Samsung", "Apple", "Xiaomi", "Samsung", "POCO", "Apple", "Spigen", "Kobo", "نور"];

export const products = Array.from({ length: 9 }, (_, i) => {
  const money = { amount: String(499 + i * 50), currencyCode: "USD" };
  const images = { edges: ["Front", "Back", "Side"].map((label) => ({ node: image(label) })) };
  const compareAtPrice = i < 2 ? { amount: String(599 + i * 50), currencyCode: "USD" } : null;
  return {
    node: {
      id: `fixture-product-${i + 1}`,
      handle: `fixture-phone-${i + 1}`,
      title:
        i === 0
          ? "Samsung Fixture Phone 512GB with a long product title"
          : i === 6
            ? "Spigen case for Apple iPhone"
            : i === 7
              ? "Kobo Clara Reader"
              : i === 8
                ? "نور مصباح ذكي"
                : `${vendors[i]} Fixture Phone ${i + 1}`,
      vendor: vendors[i],
      createdAt: `2026-08-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
      productType:
        i === 6 ? "Phone Cases" : i === 7 ? "E-Readers" : i === 8 ? "إضاءة ذكية" : "Smartphone",
      tags: ["smartphone"],
      availableForSale: true,
      description: "Local test product for catalog verification.",
      descriptionHtml: "<p>Local test product for catalog verification.</p>",
      priceRange: { minVariantPrice: money },
      compareAtPriceRange: { minVariantPrice: compareAtPrice ?? money },
      images,
      collections: {
        edges: [
          { node: { handle: "mixed-collection", title: "Mixed collection" } },
          ...(i === 0 || i === 3 ? [{ node: { handle: "samsung", title: "Samsung" } }] : []),
        ],
      },
      options: [{ name: "Storage", values: ["256GB", "512GB"] }],
      variants: {
        edges: ["256GB", "512GB"].map((storage, v) => ({
          node: {
            id: `fixture-variant-${i + 1}-${v + 1}`,
            title: storage,
            availableForSale: true,
            price: { ...money, amount: String(Number(money.amount) + v * 100) },
            compareAtPrice: compareAtPrice
              ? { ...compareAtPrice, amount: String(Number(compareAtPrice.amount) + v * 100) }
              : null,
            selectedOptions: [{ name: "Storage", value: storage }],
            image: images.edges[v].node,
            sku: `FIXTURE-${i}-${v}`,
          },
        })),
      },
    },
  };
});
