---
title: Recipe — Add a New Product Category
last_reviewed: 2026-04-09
audience: both
---

# Add a new product category

The 15 categories are hard-coded in `web/lib/categories.ts`. Adding a new one touches 3 files.

## Steps

### 1. Edit `web/lib/categories.ts`

Add a new entry to the `CATEGORIES` array:

```ts
export const CATEGORIES = [
  // ... existing 15
  { value: "hvac", label: "เครื่องปรับอากาศ" },
]
```

The `value` must be:
- lowercase, no spaces
- URL-safe (no Thai chars — used in `/products/<value>` route)
- unique

The `label` is the Thai display name shown in:
- Category filter on `/products`
- Category page heading
- Admin product form dropdown
- AI chat context strings

### 2. Add the category icon

Drop an SVG into `web/public/category-icons/<value>.svg`:

```bash
# Example
cp my-icon.svg web/public/category-icons/hvac.svg
```

Conventions:
- Square viewBox (24x24 or 64x64)
- Single color, will be tinted via CSS
- Outlined style to match existing icons
- Reference: any of the existing 15 in that folder

### 3. Add at least one product in the new category

Either via admin panel or by editing `products.json`:

```json
{
  "name": "แอร์ติดผนัง 12000 BTU",
  "category": "hvac",
  "price": 12500,
  ...
}
```

Until at least one product exists, the route `/products/hvac` will render an empty grid.

### 4. (Optional) Display in homepage `CategorySlideshowSection`

If you want the new category to appear in the homepage slideshow, check `web/components/home/CategorySlideshowSection.tsx` — it imports from `categories.ts` and should pick up the new entry automatically. Verify by loading the homepage.

### 5. Build + deploy

```bash
cd web
npx next build
# Bump adminVersion (categories.ts is backend logic)
# Commit + push → Vercel rebuilds the static category pages
```

`generateStaticParams` in `web/app/(shop)/products/[category]/page.tsx` reads from `CATEGORIES` so the new route is pre-rendered automatically.

## Files involved

- `web/lib/categories.ts` — single source of truth
- `web/public/category-icons/<value>.svg` — icon
- `web/app/(shop)/products/[category]/page.tsx` — auto-picks up new category via `generateStaticParams`
- `web/components/home/CategorySlideshowSection.tsx` — homepage slideshow (auto)
- `web/components/product/CategoryFilter.tsx` — filter UI (auto)

## Things that go wrong

- **404 on `/products/<value>`** → forgot to bump `adminVersion` and push → categories.ts wasn't deployed
- **Icon doesn't show** → SVG missing or wrong filename. Filename must exactly match the `value`
- **Old products page still shows the old list** → ISR cache is stale (1h). Force a redeploy or wait
