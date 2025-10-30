# poe.ninja API Documentation (2025)

**Last Updated**: October 2025
**Game Versions**: Path of Exile 1 & Path of Exile 2

This document provides comprehensive information about poe.ninja API endpoints for both PoE1 and PoE2, including newly discovered undocumented PoE2 endpoints via network interception.

---

## Performance Comparison

| Method | Speed | Use Case |
|--------|-------|----------|
| PoE2 Direct API | ~200ms | Use for all PoE2 leagues |
| PoE1 API | ~400ms | Use for PoE1 leagues |
| Puppeteer Scraping | ~5-10s | Fallback only |

Using PoE2 Direct API provides approximately 26x speed improvement over DOM scraping.

---

## Path of Exile 2 API

### Update (October 30, 2025)
The poe.ninja developer updated the API endpoints. The new structure is now consistent between PoE1 and PoE2.

### Base URLs
- **PoE2**: `https://poe.ninja/poe2/api/economy/`
- **PoE1**: `https://poe.ninja/poe1/api/economy/`

### Currency Exchange Overview

**Endpoint**: `/exchange/current/overview`

**Method**: `GET`

**Parameters**:
- `league` (required): League name (case-sensitive)
- `type` (required): Data type (e.g., "Currency")

**Example Requests**:
```bash
# PoE2 - Rise of the Abyssal league
curl "https://poe.ninja/poe2/api/economy/exchange/current/overview?league=Rise%20of%20the%20Abyssal&type=Currency"

# PoE2 - Standard league
curl "https://poe.ninja/poe2/api/economy/exchange/current/overview?league=Standard&type=Currency"

# PoE1 - Standard league
curl "https://poe.ninja/poe1/api/economy/exchange/current/overview?league=Standard&type=Currency"
```

**Response Structure**:
```json
{
  "core": {
    "version": "1.0",
    "timestamp": 1730000000
  },
  "lines": [
    {
      "id": "divine",
      "primaryValue": 1.0,
      "volumePrimaryValue": 1480,
      "secondaryValue": 1.0,
      "volumeSecondaryValue": 1480
    },
    {
      "id": "exalted",
      "primaryValue": 0.000559,
      "volumePrimaryValue": 1920
    }
  ],
  "items": [
    {
      "id": "divine",
      "name": "Divine Orb",
      "icon": "https://web.poecdn.com/gen/image/...",
      "tradeId": "divine"
    },
    {
      "id": "exalted",
      "name": "Exalted Orb",
      "icon": "https://web.poecdn.com/gen/image/...",
      "tradeId": "exalted"
    }
  ]
}
```

**Response Fields**:
- `core`: Metadata about the API response
  - `version`: API version
  - `timestamp`: Unix timestamp of data
- `lines`: Array of currency price data
  - `id`: Currency ID (lowercase, no spaces)
  - `primaryValue`: Chaos value (if >= 1) or items per chaos (if < 1)
  - `volumePrimaryValue`: Trading volume/listings count
- `items`: Array of currency metadata
  - `id`: Currency ID
  - `name`: Display name
  - `icon`: Icon URL
  - `tradeId`: Trade website identifier

**Price Calculation**:
```javascript
// If primaryValue >= 1: direct chaos value
const chaosPerItem = line.primaryValue; // e.g., 3.30 = 3.30 chaos per Orb of Annulment

// If primaryValue < 1: items per chaos (needs inversion)
const chaosPerItem = 1 / line.primaryValue; // e.g., 0.000559 = 1788 Ex per 1c
```

### League Names

League names are case-sensitive and must match exactly. Use the league name directly (no mapping required).

| League Name | API Support | Notes |
|-------------|-------------|-------|
| Rise of the Abyssal | ✅ PoE2 API | Full support (~200ms) |
| Standard | ✅ PoE2 API / PoE1 API | Both PoE1 and PoE2 versions |
| Dawn | ❌ Not in API | Must use browser scraping fallback |

**Testing Script**:
```typescript
// PoE2 API
const response = await axios.get('https://poe.ninja/poe2/api/economy/exchange/current/overview', {
  params: {
    league: 'Rise of the Abyssal',
    type: 'Currency'
  }
});
console.log(`Found ${response.data.lines.length} currencies`);

// PoE1 API
const response = await axios.get('https://poe.ninja/poe1/api/economy/exchange/current/overview', {
  params: {
    league: 'Standard',
    type: 'Currency'
  }
});
console.log(`Found ${response.data.lines.length} currencies`);
```

---

## Path of Exile 1 API

### Update (October 30, 2025)
The PoE1 API has been updated to match the new structure. The old `/api/data/` endpoints may still work but the new `/poe1/api/economy/` endpoints are recommended.

### New Base URL
```
https://poe.ninja/poe1/api/economy/
```

### Old Base URL (Legacy, may be deprecated)
```
https://poe.ninja/api/data/
```

### Active Leagues (PoE1)
- Standard
- Hardcore
- Settlers (if active)
- Other seasonal leagues

### Data Types

There are two main endpoint types:

#### 1. Currency Overview (`/currencyoverview`)
Types: `Currency`, `Fragment`

#### 2. Item Overview (`/itemoverview`)
Types:
- `Oil`, `Incubator`, `Scarab`, `Fossil`, `Resonator`
- `Essence`, `DivinationCard`, `SkillGem`
- `BaseType`, `HelmetEnchant`, `UniqueMap`, `Map`
- `UniqueJewel`, `UniqueFlask`, `UniqueWeapon`
- `UniqueArmour`, `UniqueAccessory`, `Beast`, `Vial`
- `DeliriumOrb`, `Omen`, `UniqueRelic`, `ClusterJewel`
- `BlightedMap`, `BlightRavagedMap`, `Invitation`
- `Memory`, `Coffin`, `AllflameEmber`

### API Endpoints

| Category | Endpoint |
|----------|----------|
| Currency | `https://poe.ninja/api/data/currencyoverview?league={LEAGUE}&type=Currency` |
| Fragment | `https://poe.ninja/api/data/currencyoverview?league={LEAGUE}&type=Fragment` |
| Oils | `https://poe.ninja/api/data/itemoverview?league={LEAGUE}&type=Oil` |
| Scarabs | `https://poe.ninja/api/data/itemoverview?league={LEAGUE}&type=Scarab` |
| Essences | `https://poe.ninja/api/data/itemoverview?league={LEAGUE}&type=Essence` |
| Divination Cards | `https://poe.ninja/api/data/itemoverview?league={LEAGUE}&type=DivinationCard` |
| Unique Maps | `https://poe.ninja/api/data/itemoverview?league={LEAGUE}&type=UniqueMap` |
| Unique Jewels | `https://poe.ninja/api/data/itemoverview?league={LEAGUE}&type=UniqueJewel` |

See `poeninjaAPI.md` for full list of endpoints.

### PoE1 Currency Response Example

```json
{
  "lines": [
    {
      "currencyTypeName": "Mirror of Kalandra",
      "pay": {
        "id": 0,
        "league_id": 161,
        "pay_currency_id": 22,
        "get_currency_id": 1,
        "sample_time_utc": "2023-03-25T20:33:07Z",
        "count": 59,
        "value": 0.0000070301,
        "listing_count": 252
      },
      "receive": {
        "id": 0,
        "league_id": 161,
        "pay_currency_id": 1,
        "get_currency_id": 22,
        "sample_time_utc": "2023-03-25T20:33:07Z",
        "count": 33,
        "value": 146900,
        "listing_count": 161
      },
      "paySparkLine": {
        "data": [],
        "totalChange": 42.25
      },
      "receiveSparkLine": {
        "data": [],
        "totalChange": -3.92
      },
      "chaosEquivalent": 143915.04,
      "detailsId": "mirror-of-kalandra"
    }
  ],
  "currencyDetails": [
    {
      "id": 22,
      "icon": "https://web.poecdn.com/gen/image/.../CurrencyDuplicate.png",
      "name": "Mirror of Kalandra",
      "tradeId": "mirror"
    }
  ]
}
```

---

## Implementation Strategy

### Recommended Approach (Multi-Tier Fallback)

```typescript
async function fetchCurrencyData(league: string): Promise<CurrencyData[]> {
  // 1. Try PoE2 Direct API (~200ms)
  try {
    return await fetchFromPoe2Api(league);
  } catch (error) {
    // League not found in PoE2 API
  }

  // 2. Try PoE1 API (~400ms)
  try {
    return await fetchFromPoe1Api(league);
  } catch (error) {
    // League not found in PoE1 API either
  }

  // 3. Fallback to Puppeteer DOM scraping (~5-10s)
  return await scrapeFromBrowser(league);
}
```

### Rate Limiting

poe.ninja enforces the following rate limits:
- Limit: 12 requests per 5 minutes
- Strategy: Shared rate limiter across all API methods
- Implementation: Use Redis-backed rate limiting

```typescript
const RATE_LIMITS = {
  POE_NINJA_REQUESTS: 12,
  POE_NINJA_WINDOW: 300000, // 5 minutes in ms
};
```

### Caching Strategy

Recommended TTL values:
```typescript
const CACHE_TTL = {
  CURRENCY_DATA: 3600,    // 1 hour (aligned with poe.ninja update frequency)
  DISCORD_EMBED: 600,     // 10 minutes (UI freshness)
  CURRENCY_LIST: 3600,    // 1 hour (currencies rarely change)
  PRICE_HISTORY: 2592000  // 30 days (historical data)
};
```

---

## Testing

### Test New API Endpoints

```bash
# Test PoE2 - Rise of the Abyssal
curl "https://poe.ninja/poe2/api/economy/exchange/current/overview?league=Rise%20of%20the%20Abyssal&type=Currency"

# Test PoE2 - Standard
curl "https://poe.ninja/poe2/api/economy/exchange/current/overview?league=Standard&type=Currency"

# Test PoE1 - Standard
curl "https://poe.ninja/poe1/api/economy/exchange/current/overview?league=Standard&type=Currency"

# Test Dawn league (expected 404 - not in API yet)
curl "https://poe.ninja/poe2/api/economy/exchange/current/overview?league=Dawn&type=Currency"
```

### Expected Results (as of Oct 30, 2025)
- Rise of the Abyssal: ~40 currencies, 200-400ms response time
- Standard (PoE2): ~31 currencies, 200-400ms response time
- Standard (PoE1): ~100+ currencies, 200-400ms response time
- Dawn: 404 (not available in API, use browser scraping fallback)

---

## Performance Metrics

### Measured Performance (October 2025)

| League | Method | Response Time | Currencies |
|--------|--------|--------------|------------|
| Rise of the Abyssal | PoE2 API | ~200ms | 40 |
| Standard (PoE2) | PoE2 API | ~200ms | 31 |
| Standard (PoE1) | PoE1 API | ~200ms | 100+ |
| Dawn | Puppeteer (fallback) | ~12,000ms | 16 |

Speed Improvement: PoE2 Direct API is approximately 26x faster than Puppeteer.

---

## Important Notes

### PoE2 API Caveats

1. **Endpoint Change**: The API structure was updated on Oct 30, 2025 (from `/currencyexchange/overview` to `/exchange/current/overview`)
2. **Sparkline Data Available**: New API includes sparkline data with 7-day trends
3. **Case-Sensitive League Names**: Must match exactly
4. **Not All Leagues Available**: Some temporary leagues (like "Dawn") may not be in the API yet - use browser scraping fallback

### League Name Mapping

```typescript
// Display name to API name mapping
const POE2_API_LEAGUE_NAMES = {
  'Dawn': 'Dawn of the Hunt',
  'Standard': 'Standard',
  'Rise of the Abyssal': 'Rise of the Abyssal',
  'abyss': 'Rise of the Abyssal'  // Slug alias
};
```

### Web URL Slugs

For web scraping URLs like `poe.ninja/poe2/economy/{slug}/currency`:

```typescript
const LEAGUE_URL_SLUGS = {
  'Dawn': 'dawn',
  'Rise of the Abyssal': 'abyss',  // Note: different from API name
  'Standard': 'standard'
};
```

---

## TypeScript Types

### PoE2 API Response Types

```typescript
interface Poe2ApiResponse {
  core: {
    version: string;
    timestamp: number;
  };
  lines: Poe2CurrencyLine[];
  items: Poe2CurrencyItem[];
}

interface Poe2CurrencyLine {
  id: string;
  primaryValue: number;
  volumePrimaryValue?: number;
  secondaryValue?: number;
  volumeSecondaryValue?: number;
}

interface Poe2CurrencyItem {
  id: string;
  name: string;
  icon?: string;
  tradeId?: string;
}
```

### PoE1 API Response Types

```typescript
interface Poe1CurrencyResponse {
  lines: CurrencyData[];
  currencyDetails: CurrencyMetadata[];
}

interface CurrencyData {
  currencyTypeName: string;
  chaosEquivalent: number;
  paySparkLine: SparkLine;
  receiveSparkLine: SparkLine;
  pay: CurrencyDetail;
  receive?: CurrencyDetail;
}

interface SparkLine {
  data: number[];
  totalChange: number;
}
```

---

## Resources

- Original PoE1 API Documentation: See `poeninjaAPI.md` (sourced from [poe-api-manager](https://github.com/ayberkgezer/poe-api-manager) by ayberkgezer)
- PoE2 API Discovery Method: Network interception via Puppeteer
- Test Scripts:
  - `test-poe2-api.ts` - Test various endpoint patterns
  - `test-network-intercept.ts` - Intercept browser requests
  - `test-direct-api.ts` - Test direct API access
  - `test-abyssal-league.ts` - Test Rise of the Abyssal league
  - `test-optimized-client.ts` - Test full implementation

---

## Summary

### Key Points

1. Use PoE2 Direct API for all PoE2 leagues (26x faster than DOM scraping)
2. League names must match exactly (case-sensitive)
3. Multi-tier fallback ensures compatibility with all leagues
4. Cache aggressively to respect rate limits
5. Monitor for API changes (endpoints are undocumented)

### Benefits

- Performance: 26x speed improvement (5-10s to 200ms)
- Reliability: Bypasses Puppeteer/DOM parsing issues
- Efficiency: Lower resource usage (no browser overhead)
- Scalability: Can handle more concurrent requests

---

**Generated**: October 2025
**Maintained by**: PoE2 Economy Discord Bot Project
**Contact**: For questions or updates, file an issue on the project repository
