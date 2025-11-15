## Benefits Local Help API

`/api/benefits/local-help` powers the “Find local help” buttons on the Benefits page. It turns the visitor’s saved location + selected help topic into nearby American Job Centers using CareerOneStop’s “List AJCs by Location” API.

### Request

```json5
POST /api/benefits/local-help
{
  "locationText": "Yazoo City, MS 39194",
  "latitude": 32.9,
  "longitude": -90.4,
  "kind": "food" // See zBenefitsLocalHelpKind
}
```

`locationText` is required (what we show in the UI). Latitude/longitude help the upstream API when available but are optional.

### Response

When configured, the endpoint proxies CareerOneStop and normalizes results to `BenefitsLocalHelpResult[]`:

```json5
{
  "source": "career-onestop-ajc",
  "lastUpdated": "2024-01-08T00:00:00.000Z",
  "items": [
    {
      "id": "123",
      "name": "Community Food Pantry",
      "description": "Free groceries once a week.",
      "address": "123 Main St",
      "city": "Yazoo City",
      "state": "MS",
      "postalCode": "39194",
      "phone": "555-123-4567",
      "website": "https://example.org",
      "distanceMiles": 1.2,
      "source": "career-onestop-ajc"
    }
  ]
}
```

If the AJC integration isn’t configured (or if the upstream request fails), we return curated sample data with `source: "sample-local-data"` so local dev/demo continues to work. The Benefits UI shows a small “Sample results” note in that case.

### Configuration

Add the following env vars (see `.env.example`):

```
CAREERONESTOP_API_BASE=https://api.careeronestop.org
CAREERONESTOP_API_TOKEN=
CAREERONESTOP_USER_ID=
CAREERONESTOP_AJC_RADIUS_MILES=25
```

Register for a CareerOneStop Web API key to receive your `token` and `userId`. We consider the integration “enabled” when both `CAREERONESTOP_API_TOKEN` and `CAREERONESTOP_USER_ID` are present. `CAREERONESTOP_API_BASE` and the radius default can be left untouched unless you need to override them.

### Error handling

- All requests are validated with `zBenefitsLocalHelpRequest`.
- Upstream calls time out after 15 seconds. If the API fails we log the error and fall back to sample data so /benefits still works.
- Logs only include the kind + configuration status (no PII).

### Caching

Responses currently rely on CDN caching (`s-maxage=60`). Add Redis caching later if we need longer-lived results.
