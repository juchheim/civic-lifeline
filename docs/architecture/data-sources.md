# Data Sources

## USDA SNAP Retailers (ArcGIS FeatureServer)
- **Purpose**: Food access map (live retailers).
- **Access**: HTTPS GET, layer query with bbox/radius; JSON features.
- **Params**: where, geometry, geometryType, spatialRel, outFields, outSR, f.
- **Pagination**: resultRecordCount/resultOffset.
- **Frequency**: On-demand (cache 10–60m) + nightly snapshot.
- **Store**: `snapRetailers` (name, address, coords, type, fetchedAt, sourceUrl).
- **Edge Cases**: Sparse hours/phone; nulls tolerated.

## BLS LAUS (Local Area Unemployment Statistics)
- **Purpose**: Jobs/skills pulse.
- **Access**: POST JSON to `/publicAPI/v2/timeseries/data`.
- **Series**: `LAUCN{STATE2}{COUNTY3}000000003` (unemployment rate).
- **Frequency**: On-demand (24h cache) + nightly refresh.
- **Store**: `lausSeries` (seriesId, countyFips, adjusted flag, monthly points).
- **Edge Cases**: Seasonally adjusted vs not; missing months—interpolate visually, don’t invent data.

## FCC National Broadband Map (CSV downloads)
- **Purpose**: Digital access summaries.
- **Access**: Bulk CSV per state/version from FCC download portal.
- **ETL**: Stream to S3, transform to county/tract aggregates.
- **Frequency**: Weekly/monthly (per FCC updates).
- **Store**: `fccBroadband` (fips, asOf, providerCount, speed tiers, tech list).
- **Edge Cases**: Large files, schema changes; version datasets with `asOf`.

## HUD Housing Counselors (JSON)
- **Purpose**: Housing help—counselors near me.
- **Access**: JSON endpoints by location or fields.
- **Frequency**: On-demand (24h cache).
- **Store**: `hudCounselorsCache` (query hash, items, fetchedAt).
- **Edge Cases**: Partial records (missing website/language).

## HUD FMR (Fair Market Rents)
- **Purpose**: Affordability context by area/year.
- **Access**: HUD API (token) by county/metro.
- **Frequency**: On-demand; cache by year.
- **Store**: `hudFmr` (fips, year, br0-br4, areaName, fetchedAt).
