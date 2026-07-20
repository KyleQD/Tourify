# Liquidity Risk, Price Discovery, and Valuation Display

A music-rights instrument can generate cash flow while remaining highly illiquid. Product design must prevent users from confusing valuation, distributions, and executable price.

## Required disclosures

Display prominently:

- no guarantee of resale or buyer availability;
- holding periods and eligibility restrictions;
- historical trade count and volume where permitted;
- bid/ask spread and quote staleness;
- valuation methodology and date;
- projected versus realized royalty distributions;
- concentration by song, platform, territory, payor, and artist;
- fees, taxes, and transfer costs;
- scenarios in which trading or distributions can be suspended.

## Price hierarchy

Store separate fields for primary issue price, last execution, best bid, best ask, partner indicative price, Tourify governed valuation range, and net distributions. Each field has its own source and must never overwrite another.

## Thin-market protections

Consider partner-controlled price collars, minimum order sizes, auction windows, call markets, volatility pauses, maximum exposure, self-trade prevention, and manual review. Tourify should not invent these controls independently of the venue.

## Performance presentation

Use time-weighted and cash-flow-aware metrics only when methodology is documented. Do not present follower growth, streams, or social engagement as investment returns. Include fees and distributions consistently.
