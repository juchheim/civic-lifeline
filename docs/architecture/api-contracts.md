# API Contracts

All responses include `{ source, lastUpdated, dataVintage? }`. Errors follow:
{ "error": { "code": "UPSTREAM_TIMEOUT", "message": "string", "upstream": "USDA" } }

## GET /api/food/snap
**Query**: `bbox=minLon,minLat,maxLon,maxLat` (required), `types=csv`, `limit=1..500`  
**200**:
```json
{
  "items": [
    {
      "id": "string",
      "name": "ACME MARKET",
      "address": "123 Main St, Yazoo City, MS",
      "coords": [-90.41, 32.89],
      "storeType": "Supermarket",
      "phone": "string|null",
      "hours": "string|null"
    }
  ],
  "source": "USDA ArcGIS",
  "lastUpdated": "2025-10-28T11:00:00Z"
}

GET /api/jobs/unemployment

Query: countyFips=NNNNN, start=YYYY, end=YYYY
200:
{
  "seriesId": "LAUCN281630000000003",
  "adjusted": false,
  "points": [{"date":"2025-08","value":8.7}],
  "source": "BLS LAUS",
  "lastUpdated": "2025-10-28T11:00:00Z"
}

GET /api/broadband/summary

Query: geo=county|tract, fips=NNNNN
200:
{
  "providerCount": 3,
  "speed": {"25_3": true, "100_20": true, "1000_100": false},
  "tech": ["Fiber","Cable"],
  "asOf": "2025-06-30",
  "source": "FCC NBM (CSV)",
  "lastUpdated": "2025-10-20T04:00:00Z",
  "dataVintage": "2025-06"
}

GET /api/housing/counselors

Query: lat, lon, radius=5..100
200:
{
  "items": [
    {
      "id": "HUD-123",
      "name": "Delta Housing Aid",
      "phone": "555-1234",
      "website": "https://example.org",
      "services": ["Rental", "Credit"],
      "languages": ["English","Spanish"],
      "coords": [-90.41, 32.89]
    }
  ],
  "source": "HUD Housing Counselor API",
  "lastUpdated": "2025-10-28T11:00:00Z"
}

GET /api/housing/fmr

Query: fips=NNNNN, year=YYYY
200:
{
  "year": 2025,
  "areaName": "Yazoo County, MS",
  "br0": 570, "br1": 620, "br2": 790, "br3": 990, "br4": 1150,
  "source": "HUD FMR API",
  "lastUpdated": "2025-10-28T11:00:00Z",
  "dataVintage": "2025"
}

POST /api/ai/coach
{ "question": "How do I apply for SNAP in MS?", "context": {"countyFips":"28163"} }
200:
{
  "answer": "Step 1: ...",
  "citations": [{"title":"MS SNAP How-To","url":"https://..."}],
  "disclaimers": ["AI-generated guidance, not legal advice"]
}

POST /api/ai/letters
Body:

{ "type":"repair_request", "inputs": {"name":"Tasha","address":"...","issue":"heater not working"} }


200:

{ "pdfUrl": "https://cdn/.../letter.pdf", "text": "Dear...", "disclaimers": ["Not legal advice"] }

POST /api/resources (auth)

Submit community resource (unverified).
201: { "id":"...", "status":"queued" }

POST /api/resources/:id/verify (moderator)

Marks as verified with notes.
200: { "id":"...", "verified":{"by":"mod@site","at":"...","method":"phone"}}