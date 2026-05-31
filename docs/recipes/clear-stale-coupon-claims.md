---
title: Recipe — Clear Stale Coupon Claims
last_reviewed: 2026-04-09
audience: both
---

# Clear stale coupon claims

Sometimes a coupon's `claimCount` drifts (test claims, abuse, season reset). The admin panel exposes a reset endpoint.

## When to use this

- A coupon shows `claimCount` higher than expected and needs to be reset to 0
- You want to remove a single bad claim (revert) instead of clearing all
- You're testing claim flow in `/admin/test-claim` and want to clean up test data

## Reset all claims for one coupon

API: `POST /api/admin/reset-claims` (admin role required)

```bash
curl -X POST https://31panich.co.th/api/admin/reset-claims \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=..." \
  -d '{"couponId":"abc123"}'
```

Response:
```json
{ "removedCount": 45, "newCount": 0 }
```

This:
1. Calls `removeAllClaimsForCoupon(couponId)` → deletes all matching `ClaimRecord` rows from `coupon-claims.json`
2. Calls `resetClaimCount(couponId)` → sets `coupon.claimCount = 0` in `coupons.json`
3. Both operations use `withLock` so they're atomic per file

You can also click the reset button in `/admin/coupons` if it's still wired up.

## Revert a single claim

API: `POST /api/admin/revert-claim`

```bash
curl -X POST https://31panich.co.th/api/admin/revert-claim \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=..." \
  -d '{"claimId":"<uuid>"}'
```

Response: `{ ok: true }`

## Inspect current claims

API: `GET /api/admin/coupon-claims?couponId=<id>` returns the full list of `ClaimRecord` for that coupon. Useful for figuring out which claim to revert.

## Files involved

- `web/lib/coupons.ts` — `resetClaimCount`, `atomicClaim`
- `web/lib/coupon-claims.ts` — `addClaim`, `removeAllClaimsForCoupon`
- `web/app/api/admin/reset-claims/route.ts` — handler
- `web/app/api/admin/revert-claim/route.ts` — handler
- `web/app/api/admin/coupon-claims/route.ts` — list handler
- `web/data/coupons.json`, `web/data/coupon-claims.json` — data files

## Things that go wrong

- **`removedCount: 0` but the claim still shows** → check that you used the right `couponId`. The id in `coupons.json` ≠ the human-readable `code`
- **Claim count won't go down** → confirm Upstash Redis has the latest `data:coupons.json`. The 30s in-memory cache in `blob-store.ts` may show stale data on a warm lambda — call `?fresh=1` on the read endpoint or wait
- **Concurrent claim came in mid-reset** → unlikely but possible. The atomic lock is per-file and per-instance, so two lambdas could race. If this happens often, switch the lock to Redis SETNX
