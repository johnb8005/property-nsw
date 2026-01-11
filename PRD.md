# Product Requirements Document
## NSW Property Investor Intel

**Version:** 1.0  
**Date:** January 2026  
**Author:** [Your Name]  
**Status:** Draft

---

## 1. Executive Summary

### 1.1 Problem Statement

Property investors in Australia spend significant time and money ($2,000+/year) on tools like CoreLogic RP Data, SuburbsFinder, and Microburbs to answer basic questions:

- Which suburbs are growing fastest?
- Where can I get the best yield?
- Is this suburb overpriced or undervalued?

Yet much of this data originates from **free public sources** (NSW Valuer General, ABS, state planning portals). Existing tools repackage public data with cluttered interfaces, opaque methodologies, and premium pricing.

### 1.2 Solution

Build a clean, affordable suburb analytics platform for NSW property investors that:

- Visualises all NSW property sales on an interactive map
- Ranks suburbs by growth, yield, and momentum metrics
- Provides transparent methodology (users can verify our calculations)
- Prices at $19-29/month (undercutting competitors by 50-80%)

### 1.3 Target Outcome

- **6-month goal:** 500 paying users × $24/month = $12,000 MRR
- **12-month goal:** 2,000 paying users × $24/month = $48,000 MRR

---

## 2. Target Users

### 2.1 Primary: Self-Directed Property Investors

**Demographics:**
- Age 30-55
- Own 1-3 investment properties (or looking to buy first)
- Household income $100k-250k
- Technically competent but not data scientists

**Behaviours:**
- Research suburbs for 2-6 months before buying
- Currently use free tools (Domain, REA, PropertyValue) but want more depth
- Unwilling to pay $200+/month for RP Data
- Value transparency and being able to "check the numbers"

**Jobs to Be Done:**
1. "Help me find suburbs that will grow faster than average"
2. "Show me where I can get 5%+ rental yield"
3. "Tell me if this suburb is overpriced compared to similar areas"
4. "Alert me when a suburb I'm watching has a price drop"

### 2.2 Secondary: Buyers Agents & Small Agencies

**Demographics:**
- Small buyers agency (1-5 staff)
- Can't justify $500+/month for enterprise tools
- Need to produce client reports

**Jobs to Be Done:**
1. "Give me data to back up my suburb recommendations"
2. "Help me find opportunities before my competitors"
3. "Let me export data for client presentations"

---

## 3. Competitive Landscape

| Competitor | Price | Strengths | Weaknesses |
|------------|-------|-----------|------------|
| **CoreLogic RP Data** | $169-299/mo | Comprehensive, trusted by banks | Expensive, agent-focused |
| **SuburbsFinder** | $50-100/mo | Good filters, 30yr forecasts | Cluttered UI, overwhelming |
| **Microburbs** | $95-350/mo | Street-level, AI forecasts | Expensive, complex |
| **Boomscore** | Free (basic) | Simple score, alerts | Limited depth |
| **Picki** | Free | Clean UI, listings | Light on analytics |

### 3.1 Our Positioning

**"The honest, affordable alternative for serious investors"**

- 100% built on free public data — we show our sources
- Clean, fast UI — no feature bloat
- Half the price of competitors
- NSW-deep before going wide

---

## 4. Feature Requirements

### 4.1 MVP Features (Phase 1 — Weeks 1-4)

#### F1: Interactive Sales Map
**Priority:** P0 (Must Have)

| Requirement | Details |
|-------------|---------|
| Description | Display all NSW property sales on an interactive map |
| Data Source | NSW Valuer General bulk PSI files (free) |
| User Actions | Pan, zoom, click for details, filter by price/date/zone |
| Visualisation | Colour-coded markers by price range or $/sqm |
| Performance | Handle 100k+ markers with clustering |

**Acceptance Criteria:**
- [ ] User can upload .DAT file or use pre-loaded NSW data
- [ ] Map loads in < 3 seconds
- [ ] Clicking marker shows: address, price, date, land size, $/sqm, zone
- [ ] Filters update map in < 500ms

---

#### F2: Suburb Rankings Table
**Priority:** P0 (Must Have)

| Requirement | Details |
|-------------|---------|
| Description | Sortable table ranking all NSW suburbs by key metrics |
| Metrics | Median price, 1yr/3yr/5yr growth %, sales volume, $/sqm |
| Filters | Price range, growth %, LGA, property type (house/unit) |
| Sorting | Click column headers to sort |

**Acceptance Criteria:**
- [ ] All 600+ NSW suburbs with sufficient data displayed
- [ ] Metrics calculated from Valuer General data
- [ ] User can filter to "suburbs with growth > 5% and median < $800k"
- [ ] Table exports to CSV

---

#### F3: Suburb Detail Page
**Priority:** P0 (Must Have)

| Requirement | Details |
|-------------|---------|
| Description | Deep-dive page for individual suburb |
| Content | Price trend chart, recent sales list, key stats, map of sales |
| Charts | Median price over time (monthly), sales volume over time |
| Stats | Median, growth %, sales count, avg $/sqm, dominant zone |

**Acceptance Criteria:**
- [ ] Clicking suburb in table opens detail page
- [ ] Price chart shows 5+ years of history
- [ ] Recent sales list shows last 20 sales with details
- [ ] User can toggle between houses and units

---

#### F4: Compare Suburbs
**Priority:** P1 (Should Have)

| Requirement | Details |
|-------------|---------|
| Description | Side-by-side comparison of 2-5 suburbs |
| Metrics | All metrics from rankings table |
| Visualisation | Bar charts comparing each metric |

**Acceptance Criteria:**
- [ ] User can select suburbs from search or table
- [ ] Comparison view shows metrics side-by-side
- [ ] Charts visualise differences clearly

---

#### F5: User Accounts & Paywall
**Priority:** P0 (Must Have)

| Requirement | Details |
|-------------|---------|
| Free Tier | Map view, top 20 suburbs, basic stats |
| Paid Tier | Full rankings, all filters, CSV export, compare tool |
| Auth | Email/password, Google OAuth |
| Payments | Stripe subscription ($24/month or $199/year) |

**Acceptance Criteria:**
- [ ] Free users see blurred/limited data with upgrade prompts
- [ ] Paid users have full access
- [ ] Subscription can be cancelled anytime
- [ ] 14-day free trial for paid tier

---

### 4.2 Phase 2 Features (Weeks 5-8)

#### F6: Rental Yield Estimates
**Priority:** P1 (Should Have)

| Requirement | Details |
|-------------|---------|
| Description | Calculate gross rental yield by suburb |
| Data Source | Scraped median rents from Domain/Flatmates OR SQM Research API |
| Calculation | (Median weekly rent × 52) / Median price × 100 |
| Display | Add yield column to rankings, yield on suburb detail page |

**Technical Notes:**
- Rental data not in Valuer General files — requires additional data source
- Option A: Scrape Domain rental listings (legal grey area)
- Option B: Purchase SQM Research data (~$30/month)
- Option C: Use ABS census rent data (free but 2021, outdated)

---

#### F7: Email Alerts
**Priority:** P1 (Should Have)

| Requirement | Details |
|-------------|---------|
| Description | Weekly email digest with suburb updates |
| Triggers | User-selected suburbs, price changes > 5%, new sales |
| Frequency | Weekly (Mondays) |

**Acceptance Criteria:**
- [ ] User can "watch" up to 10 suburbs (free) or unlimited (paid)
- [ ] Email summarises key changes in watched suburbs
- [ ] One-click unsubscribe

---

#### F8: Momentum Score (Proprietary Algorithm)
**Priority:** P2 (Nice to Have)

| Requirement | Details |
|-------------|---------|
| Description | Single 0-100 score indicating suburb "heat" |
| Inputs | Growth rate, sales volume trend, $/sqm trend, days on market (if available) |
| Display | Score badge on suburb cards, sortable in rankings |

**Algorithm (v1 — simple):**
```
momentum = (
  growth_1yr_percentile × 0.4 +
  volume_trend_percentile × 0.3 +
  price_per_sqm_trend_percentile × 0.3
)
```

---

### 4.3 Phase 3 Features (Weeks 9-12)

#### F9: Growth Forecast
**Priority:** P2 (Nice to Have)

| Requirement | Details |
|-------------|---------|
| Description | Predict 1-year forward price growth |
| Methodology | Linear regression on historical data + macro factors |
| Disclaimer | "Forecast only — past performance ≠ future results" |
| Display | Forecast column in rankings, confidence interval on detail page |

**Technical Notes:**
- Start with simple trend extrapolation
- Later: add ABS population growth, building approvals, interest rate sensitivity

---

#### F10: API Access
**Priority:** P3 (Future)

| Requirement | Details |
|-------------|---------|
| Description | RESTful API for developers |
| Endpoints | /suburbs, /suburbs/{id}, /sales, /rankings |
| Auth | API key |
| Pricing | $0.01/call or $99/month unlimited |

---

## 5. Data Architecture

### 5.1 Data Sources

| Source | Data | Frequency | Cost |
|--------|------|-----------|------|
| NSW Valuer General PSI | Sales records 1990-present | Weekly | Free |
| NSW Valuer General LVI | Land values | Monthly | Free |
| GNAF | Geocoded addresses | Quarterly | Free |
| ABS | Population, income, demographics | Annual | Free |
| SQM Research | Rental data, vacancy rates | Monthly | ~$30/mo |
| Domain/REA | Listings, days on market | Scraped | Free (grey area) |

### 5.2 Data Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  NSW Valuer     │────▶│   ETL Pipeline  │────▶│   PostgreSQL    │
│  General .DAT   │     │   (Python)      │     │   Database      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
┌─────────────────┐                                     ▼
│  GNAF Geocoding │─────────────────────────────▶ Geocoded Sales
└─────────────────┘                                     │
                                                        ▼
                                               ┌─────────────────┐
                                               │  Aggregation    │
                                               │  (by suburb)    │
                                               └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  API / Frontend │
                                               └─────────────────┘
```

### 5.3 Data Model

**Sales Table:**
```sql
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(20),
  address TEXT,
  suburb VARCHAR(100),
  postcode VARCHAR(4),
  lga VARCHAR(100),
  price INTEGER,
  land_area DECIMAL,
  contract_date DATE,
  settlement_date DATE,
  zone_code VARCHAR(10),
  property_type VARCHAR(20),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMP
);
```

**Suburb Stats Table (Materialized View):**
```sql
CREATE MATERIALIZED VIEW suburb_stats AS
SELECT
  suburb,
  postcode,
  property_type,
  COUNT(*) as sales_count_1yr,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price,
  AVG(price / NULLIF(land_area, 0)) as avg_price_per_sqm,
  -- growth calculations
  ...
FROM sales
WHERE settlement_date > NOW() - INTERVAL '1 year'
GROUP BY suburb, postcode, property_type;
```

---

## 6. Technical Architecture

### 6.1 Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React + TypeScript | Modern, fast, good ecosystem |
| Mapping | Leaflet + OpenStreetMap | Free, performant |
| Charts | Recharts or Chart.js | Simple, React-native |
| Backend | Node.js + Express OR Python + FastAPI | Fast development |
| Database | PostgreSQL + PostGIS | Geospatial queries |
| Auth | Clerk or Auth0 | Fast to implement |
| Payments | Stripe | Industry standard |
| Hosting | Vercel (frontend) + Railway/Render (backend) | Low ops overhead |
| Data Pipeline | Python + Pandas + Cron | Simple ETL |

### 6.2 Infrastructure Costs (Estimated)

| Service | Monthly Cost |
|---------|--------------|
| Vercel Pro | $20 |
| Railway (backend + DB) | $20-50 |
| Stripe fees | 2.9% + $0.30/transaction |
| SQM Research (rental data) | $30 |
| Domain (optional) | $15/year |
| **Total** | ~$80-120/month |

Break-even at ~5 paying customers.

---

## 7. Design Requirements

### 7.1 Design Principles

1. **Clean over feature-rich** — Every element must earn its place
2. **Data-forward** — Numbers are the hero, not chrome
3. **Fast** — Pages load in < 2 seconds
4. **Transparent** — Show data sources, methodology, last updated dates

### 7.2 Visual Style

- **Aesthetic:** Professional, minimal, dark mode default (analyst-friendly)
- **Typography:** Monospace for numbers (JetBrains Mono), clean sans for UI (Inter)
- **Colour:** Dark background (#0a0f1a), blue accents (#3b82f6), green/red for changes
- **Inspiration:** Bloomberg Terminal meets modern SaaS

### 7.3 Key Screens

1. **Dashboard** — Map + top suburbs + recent sales
2. **Rankings** — Full sortable/filterable table
3. **Suburb Detail** — Charts, stats, recent sales, map
4. **Compare** — Side-by-side suburb comparison
5. **Pricing** — Free vs paid tier comparison
6. **Settings** — Account, alerts, billing

---

## 8. Go-to-Market Strategy

### 8.1 Positioning Statement

> **For** self-directed property investors in NSW  
> **Who** want data-driven suburb insights without paying $200+/month  
> **Our product** is an affordable suburb analytics platform  
> **That** ranks suburbs by growth, yield, and momentum using 100% public data  
> **Unlike** RP Data, SuburbsFinder, and Microburbs  
> **We** offer transparent methodology, cleaner UX, and pricing that respects your wallet

### 8.2 Pricing

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Map view, top 20 suburbs, basic stats, 3 watched suburbs |
| **Pro** | $24/month | Full rankings, all filters, CSV export, compare tool, unlimited alerts |
| **Annual** | $199/year (~$16.50/mo) | Pro features + 2 months free |

### 8.3 Launch Channels

| Channel | Tactic | Cost |
|---------|--------|------|
| **Reddit** | Post in r/AusProperty, r/AusFinance with free tool | Free |
| **PropertyChat** | Forum posts, value-add comments | Free |
| **SEO** | "Best suburbs to invest in NSW 2026" content | Free |
| **YouTube** | "How I analyse suburbs for free" tutorial | Free |
| **Facebook Groups** | Australian Property Investors groups | Free |
| **Paid Ads** | Google Ads on "property investment tools" | $500 test budget |

### 8.4 Success Metrics

| Metric | 3-Month Target | 6-Month Target |
|--------|----------------|----------------|
| Website visitors | 5,000/month | 15,000/month |
| Free signups | 500 | 2,000 |
| Paid conversions | 50 (10%) | 500 (25%) |
| MRR | $1,200 | $12,000 |
| Churn rate | < 10%/month | < 5%/month |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Data quality issues** | Medium | High | Validate against known sales, show last-updated dates |
| **Competitor response** (price drop) | Low | Medium | Focus on UX and transparency as differentiators |
| **Scraping blocked** (if using Domain/REA) | Medium | Medium | Use official data sources only, or purchase rental data |
| **Low conversion rate** | Medium | High | A/B test paywall placement, offer 14-day trial |
| **Scaling issues** | Low | Medium | Use materialized views, CDN for static assets |

---

## 10. Milestones & Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 1: MVP** | Weeks 1-4 | Map, rankings table, suburb detail, basic paywall |
| **Phase 2: Growth** | Weeks 5-8 | Rental yield, email alerts, momentum score |
| **Phase 3: Polish** | Weeks 9-12 | Growth forecasts, API, mobile optimization |
| **Launch** | Week 4 | Soft launch to Reddit/forums |
| **Marketing Push** | Week 8 | Content marketing, paid ads test |

---

## 11. Open Questions

1. **Rental data source:** Scrape Domain (risky), buy SQM (costs $), or skip yield for MVP?
2. **Geocoding:** Use GNAF (free but complex) or paid geocoding API (simpler)?
3. **State expansion:** When to add VIC/QLD? After 1,000 NSW users?
4. **Mobile app:** Web-only for MVP, or React Native later?
5. **B2B tier:** Offer agency pricing ($99/month, 5 seats) in Phase 2?

---

## 12. Appendix

### A. Data Field Reference (NSW Valuer General PSI)

| Field | Description |
|-------|-------------|
| District Code | LGA identifier |
| Property ID | Unique property identifier |
| Unit Number | Unit/apartment number |
| House Number | Street number |
| Street Name | Street name |
| Suburb | Suburb name |
| Postcode | 4-digit postcode |
| Area | Land area |
| Area Type | M (sqm) or H (hectares) |
| Contract Date | Date of sale contract |
| Settlement Date | Date of settlement |
| Purchase Price | Sale price in dollars |
| Zone Code | Planning zone (R1, R2, B1, etc.) |
| Nature of Property | R (Residence), V (Vacant), etc. |
| Primary Purpose | Property description |
| Strata Lot Number | Strata plan reference |
| Dealing Number | Land Registry reference |

### B. Competitor Pricing Detail

| Product | Monthly | Annual | Notes |
|---------|---------|--------|-------|
| RP Data Pro | $169 | $2,028 | Per seat |
| SuburbsFinder | $97 | $970 | Single user |
| Microburbs Starter | $95 | - | Limited features |
| Microburbs Pro | $175 | - | Full features |
| Microburbs Advanced | $350 | - | AI forecasts |
| Boomscore | Free | - | Limited to score only |

### C. Useful Links

- NSW Valuer General PSI: https://valuation.property.nsw.gov.au/embed/propertySalesInformation
- GNAF (addresses): https://data.gov.au/dataset/geocoded-national-address-file-g-naf
- ABS Census Data: https://www.abs.gov.au/census
- SQM Research: https://sqmresearch.com.au/

---

*Document ends.*