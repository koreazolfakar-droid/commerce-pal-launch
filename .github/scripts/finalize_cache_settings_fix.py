from pathlib import Path


def remove_div_containing(source: str, marker: str) -> str:
    lines = source.splitlines(keepends=True)
    marker_index = next((i for i, line in enumerate(lines) if marker in line), None)
    if marker_index is None:
        raise SystemExit(f"Could not find field marker: {marker}")

    start = marker_index
    while start >= 0:
        stripped = lines[start].strip()
        if stripped.startswith("<div") and not stripped.startswith("</div"):
            break
        start -= 1
    if start < 0:
        raise SystemExit(f"Could not find opening div for: {marker}")

    opening_indent = len(lines[start]) - len(lines[start].lstrip())
    end = marker_index
    while end < len(lines):
        if lines[end].strip() == "</div>" and len(lines[end]) - len(lines[end].lstrip()) == opening_indent:
            break
        end += 1
    if end >= len(lines):
        raise SystemExit(f"Could not find closing div for: {marker}")

    del lines[start : end + 1]
    return "".join(lines)


settings_path = Path("src/components/admin/SettingsEditor.tsx")
settings = settings_path.read_text()
settings = remove_div_containing(settings, 'text("الاسم الظاهر", "Display label")')
settings = remove_div_containing(settings, 'text("المجموعة", "Group")')
settings = remove_div_containing(settings, 'text("متاح للواجهة العامة", "Available to storefront")')
settings = settings.replace(
    'className="grid gap-3 p-3.5 sm:grid-cols-4 sm:p-4"',
    'className="grid gap-3 p-3.5 sm:grid-cols-2 sm:p-4"',
    1,
)
settings = settings.replace('className="sm:col-span-4"', 'className="sm:col-span-2"')
for stale_field in ("row.label", "row.groupName", "row.isPublic"):
    if stale_field in settings:
        raise SystemExit(f"Stale settings field still present: {stale_field}")
for required_fragment in (
    'text("المفتاح", "Key")',
    'text("نوع القيمة", "Value type")',
    'text("القيمة", "Value")',
    'text("رفع ملف", "Upload file")',
):
    if required_fragment not in settings:
        raise SystemExit(f"Required settings UI was removed: {required_fragment}")
settings_path.write_text(settings)

shopify_path = Path("src/lib/shopify.ts")
shopify = shopify_path.read_text()
ttl_line = "const STOREFRONT_CACHE_TTL_MS = 60_000;\n"
stale_line = "const STOREFRONT_STALE_TTL_MS = 5 * 60_000;\n"
if ttl_line not in shopify:
    raise SystemExit("Storefront cache TTL definition not found")
if "const STOREFRONT_STALE_TTL_MS" not in shopify:
    shopify = shopify.replace(ttl_line, ttl_line + stale_line, 1)
if shopify.count("STOREFRONT_STALE_TTL_MS") < 2:
    raise SystemExit("Storefront stale TTL definition/use is incomplete")
shopify_path.write_text(shopify)
