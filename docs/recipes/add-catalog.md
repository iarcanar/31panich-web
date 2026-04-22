---
title: Recipe — Add a Brand Catalog
last_reviewed: 2026-04-22
audience: both
---

# Add a brand catalog to the homepage

Catalogs shown on `/catalog` (homepage section) are hard-coded in `web/lib/catalogs.ts`.
Adding one touches 2 files + 1 image asset.

## Steps

### 1. Prepare the catalog cover image

Target spec (match existing catalogs — 10–50KB range):
- Format: **WebP**
- Width: **500px** (height auto, aspect roughly 3:4)
- Quality: **80**
- Output: `web/public/catalog/<id>.webp`

Quick convert via Python/Pillow:

```python
from PIL import Image
im = Image.open("source.jpg").convert("RGB")
w, h = im.size
im = im.resize((500, int(h * 500 / w)), Image.LANCZOS)
im.save("web/public/catalog/<id>.webp", "WEBP", quality=80, method=6)
```

Or use **reMAGE** (`admin_files/tools/remage.bat`) with the General/Promo preset, then move the output into `web/public/catalog/`.

### 2. Edit `web/lib/catalogs.ts`

Add entry to the `CATALOGS` array. **Position in the array = display order** (index 0 shows first).

```ts
export const CATALOGS = [
  {
    id: "osuka",                 // lowercase, URL-safe, unique
    brand: "Osuka",              // display name
    description: "แคตตาล็อก…",   // 1-line Thai description
    url: "https://anyflip.com/qjteo/lhvk/",  // external link OR /catalog/xxx.pdf
    image: "/catalog/osuka.webp",
  },
  // ... existing entries
] as const
```

`url` can be:
- External flipbook URL (AnyFlip, Issuu, brand site)
- Local PDF in `web/public/catalog/xxx.pdf`

### 3. Build + deploy

```bash
cd web
npx next build
# Bump "version" (frontend-facing change)
git add lib/catalogs.ts public/catalog/<id>.webp package.json
git commit -m "feat(catalog): add <Brand> catalog"
git push
```

## How it renders

[`CatalogSection.tsx`](../../components/home/CatalogSection.tsx) auto-picks up the new entry:
- Card image and "ดูแคตตาล็อก" button **both** link to `url` (opens in new tab)
- Grid is 2 columns on mobile, 3 on desktop
- Hover: lift + emerald border glow

## Things that go wrong

- **Image too heavy** → didn't resize to 500px wide, or used PNG/JPG instead of WebP. Existing catalogs are all <50KB
- **Broken cover** → filename in `image:` doesn't match the actual file in `/public/catalog/`
- **Card doesn't appear** → forgot to bump `version` and push, or Vercel build failed. Check deploy log
- **Link doesn't open** → `url` typo or missing `https://` on external links
