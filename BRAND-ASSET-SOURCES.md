# Brand asset sources

The following verified assets are bundled under `src/assets/brands/`. Their geometry is preserved; white logo tiles prevent theme filters from altering their identity.

| Brand | Bundled filename | Source |
|---|---|---|
| Apple | `apple.svg` | [Simple Icons 16 vector](https://cdn.jsdelivr.net/npm/simple-icons@16.0.0/icons/apple.svg), with metadata pointing to [Apple](https://www.apple.com/) |
| Samsung | `samsung.png` | [Official logo ZIP](https://images.samsung.com/is/content/samsung/assets/global/about-us/resource/Samsung_lettermark.zip), blue transparent 1600×425 lettermark from [Samsung brand identity](https://www.samsung.com/us/about-us/brand-identity/logo/) |
| Xiaomi | `xiaomi.svg` | [Simple Icons vector](https://cdn.jsdelivr.net/npm/simple-icons@16.0.0/icons/xiaomi.svg), original geometry with its metadata brand colour; metadata points to [Xiaomi](https://www.mi.com/global/) |
| Anker | `anker.svg` | Verbatim desktopLogo SVG extracted from the [official Anker website](https://www.anker.com/) |
| POCO | `poco.png` | [Official PNG](https://i02.appmifile.com/930_operatorx_operatorx_xm/04/07/2024/3e49f982a9641e9f0e3e351927c61a77.png), referenced by [Xiaomi POCO](https://www.mi.com/global/poco/), 104×60 black/yellow mark |
| Vention | `vention.png` | [Official transparent PNG](https://ventiontech.com/cdn/shop/files/Vention_Logo_Blue.png?v=1769746770&width=1024), referenced by [Vention electronics](https://ventiontech.com/) |

The former Anker nautical anchor, POCO furniture-store wordmark and Vention software-brand wordmark were replaced. Existing Black Shark, realme, REDMAGIC, REDMI, TECNO and UGREEN marks were retained after visual inspection; this was not a new official-source audit of those retained assets.

POCO and realme retain their original yellow logo rectangles inside the white tile. Unknown brands use a text fallback until an original logo is uploaded to the exact Shopify `logo-<slug>` collection.

[Simple Icons source and trademark notice](https://github.com/simple-icons/simple-icons#disclaimer).
