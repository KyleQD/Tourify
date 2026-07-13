# Artist Store Completion — Smoke Checklist

Use after deploying Phases A–F.

1. **Featured curation**
   - Open `/artist/store` → Listings → feature 2 published items (sparkles)
   - Open public `/artist/{username}#public-artist-storefront`
   - Featured tab shows only featured items

2. **Sections**
   - Storefront tab → toggle sections → Save
   - Public profile tabs match enabled sections

3. **Analytics**
   - Store Analytics tab shows 30d revenue/orders/top products
   - Artist home commerce card shows Store revenue (30d)

4. **Product posts**
   - Share listing to feed from listing row
   - Feed shows listing card with View/Buy

5. **Listing detail**
   - Open `/marketplace/listings/{id}` for a published listing
   - Buy starts checkout; draft IDs 404 for non-owners

6. **Seller ops**
   - Orders tab expands line items + shipping
   - Low-stock listing restock (+25) works

7. **Regression**
   - `/venue/dashboard/store` and `/dashboard/store` still load
   - Discover without `featuredOnly` unchanged
   - Feed posts without listing refs unchanged
