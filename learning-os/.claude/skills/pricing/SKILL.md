---
name: pricing
description: Price the tools/hardware a checkpoint or project needs, scoped to a market (location+currency). Cache-first — only searches when the deterministic check_price tool signals stale/missing data. Use when the user asks what something costs, or as part of drafting a syllabus that calls for physical hardware. Supports steerable reruns for a different market or a refresh.
---

# Pricing

Given an item (or a list of items from a checkpoint/project) and a market,
return a price using cached data when it's fresh, and only search when it
genuinely needs refreshing.

## Steps

1. **Market is required, not assumed.** If the user (or the calling context —
   e.g. a syllabus-draft skill run) hasn't specified a market (e.g. `IN`
   for India/INR, `US` for USA/USD), ask before proceeding. Do not default
   silently to any market.
2. For each item, call `check_price` with the item name and market.
   - If `needsSkill: false`: use the returned `observation` directly — no
     search needed. This is the common case and should be fast/cheap.
   - If `needsSkill: true`: this item has no fresh-enough data for this
     market. Proceed to step 3.
3. Use WebSearch scoped to the market (e.g. include the country/site in the
   query, or use market-appropriate retailer names) to find current listings.
   Prefer 2-3 real, currently-live listings over one. Note the seller and a
   direct product URL for each.
4. Call `append_price_observation` with the item, market, currency, today's
   date, the price you found (pick the most representative one if listings
   vary — usually the median or the most reputable seller, not the cheapest
   outlier), `available: true/false`, and the source URL. This is
   append-only — it never overwrites a prior observation, so don't worry
   about "losing" old data.
5. If a paid item has a genuine free alternative or workaround (a free tier,
   an open-source substitute, a DIY approach), note it explicitly — with its
   downside — rather than only reporting the paid price.
6. Report: item, price, currency, availability, source link(s), and any
   free alternative, for every item asked about — not just the ones that
   needed a fresh search.

## Steerable reruns

- A different market for the same item: just re-run from step 2 with the new
  market — `check_price` naturally reports `needsSkill: true` for a market
  with no prior data, so this "just works" without special-casing.
- "Refresh this" / "that price seems old": call `check_price` with a small
  `staleDays` override (e.g. `0`) to force `needsSkill: true` regardless of
  the normal staleness window, then proceed from step 3.

## Notes

- Never fabricate a price. If you cannot find a real current listing, say so
  rather than estimating one and presenting it as researched.
- This skill never gives the underlying `check_price` tool network access —
  `check_price` is a pure cache read (spec §4's skill-vs-tool principle). All
  searching happens in this skill's own steps, using the agent's own
  WebSearch/WebFetch.
