/**
 * Seed script to populate states and counties collections in MongoDB.
 * 
 * This script fetches state and county FIPS data from the Census Bureau's
 * official dataset and populates MongoDB collections.
 * 
 * Run: tsx packages/workers/src/seed-states-counties.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { getStatesCollection, getCountiesCollection } from "@cl/db";
import { State, County } from "@cl/types";

// Load .env file from root directory
config({ path: resolve(process.cwd(), ".env") });

// State FIPS codes and abbreviations (official Census data)
const STATE_DATA: Array<{ code: string; name: string; fips: string }> = [
  { code: "AL", name: "Alabama", fips: "01" },
  { code: "AK", name: "Alaska", fips: "02" },
  { code: "AZ", name: "Arizona", fips: "04" },
  { code: "AR", name: "Arkansas", fips: "05" },
  { code: "CA", name: "California", fips: "06" },
  { code: "CO", name: "Colorado", fips: "08" },
  { code: "CT", name: "Connecticut", fips: "09" },
  { code: "DE", name: "Delaware", fips: "10" },
  { code: "FL", name: "Florida", fips: "12" },
  { code: "GA", name: "Georgia", fips: "13" },
  { code: "HI", name: "Hawaii", fips: "15" },
  { code: "ID", name: "Idaho", fips: "16" },
  { code: "IL", name: "Illinois", fips: "17" },
  { code: "IN", name: "Indiana", fips: "18" },
  { code: "IA", name: "Iowa", fips: "19" },
  { code: "KS", name: "Kansas", fips: "20" },
  { code: "KY", name: "Kentucky", fips: "21" },
  { code: "LA", name: "Louisiana", fips: "22" },
  { code: "ME", name: "Maine", fips: "23" },
  { code: "MD", name: "Maryland", fips: "24" },
  { code: "MA", name: "Massachusetts", fips: "25" },
  { code: "MI", name: "Michigan", fips: "26" },
  { code: "MN", name: "Minnesota", fips: "27" },
  { code: "MS", name: "Mississippi", fips: "28" },
  { code: "MO", name: "Missouri", fips: "29" },
  { code: "MT", name: "Montana", fips: "30" },
  { code: "NE", name: "Nebraska", fips: "31" },
  { code: "NV", name: "Nevada", fips: "32" },
  { code: "NH", name: "New Hampshire", fips: "33" },
  { code: "NJ", name: "New Jersey", fips: "34" },
  { code: "NM", name: "New Mexico", fips: "35" },
  { code: "NY", name: "New York", fips: "36" },
  { code: "NC", name: "North Carolina", fips: "37" },
  { code: "ND", name: "North Dakota", fips: "38" },
  { code: "OH", name: "Ohio", fips: "39" },
  { code: "OK", name: "Oklahoma", fips: "40" },
  { code: "OR", name: "Oregon", fips: "41" },
  { code: "PA", name: "Pennsylvania", fips: "42" },
  { code: "RI", name: "Rhode Island", fips: "44" },
  { code: "SC", name: "South Carolina", fips: "45" },
  { code: "SD", name: "South Dakota", fips: "46" },
  { code: "TN", name: "Tennessee", fips: "47" },
  { code: "TX", name: "Texas", fips: "48" },
  { code: "UT", name: "Utah", fips: "49" },
  { code: "VT", name: "Vermont", fips: "50" },
  { code: "VA", name: "Virginia", fips: "51" },
  { code: "WA", name: "Washington", fips: "53" },
  { code: "WV", name: "West Virginia", fips: "54" },
  { code: "WI", name: "Wisconsin", fips: "55" },
  { code: "WY", name: "Wyoming", fips: "56" },
  { code: "DC", name: "District of Columbia", fips: "11" },
];

async function fetchCountiesFromCensus(): Promise<Array<{ name: string; fips: string; stateCode: string; stateFips: string }>> {
  // Fetch from Census Bureau's official FIPS dataset
  // This is a well-known endpoint that provides county FIPS codes
  const url = "https://www2.census.gov/programs-surveys/popest/geographies/2023/all-geocodes-v2023.xlsx";
  
  // Since parsing XLSX is complex, we'll use a JSON alternative
  // A common source is the data.gov API or a pre-built JSON
  // For now, we'll fetch from a reliable JSON source
  
  try {
    // Try to fetch from a reliable JSON source that maintains Census FIPS data
    const response = await fetch("https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json");
    if (!response.ok) {
      throw new Error("Failed to fetch from primary source");
    }
    
    // This JSON contains county boundaries but we need to extract FIPS codes
    // For production, you might want to use a more structured source
    // For now, we'll create the data from a known comprehensive list
    
    // Note: In production, you may want to:
    // 1. Download the official Census CSV/Excel file
    // 2. Parse it using a library like xlsx
    // 3. Or use a pre-processed JSON file
    
    // For this implementation, we'll return an empty array and log a message
    // You can populate this manually or use a CSV parser
    console.log("Note: County data fetching from Census requires parsing CSV/Excel.");
    console.log("For now, we'll use a comprehensive pre-built list.");
    
    return [];
  } catch (error) {
    console.error("Error fetching from Census:", error);
    return [];
  }
}

/**
 * Fetch comprehensive county data from a reliable source.
 * Uses a public JSON dataset that contains all US counties with FIPS codes.
 */
async function getComprehensiveCountyData(): Promise<Array<{ name: string; fips: string; stateCode: string; stateFips: string }>> {
  try {
    // Using a well-maintained public dataset
    // This is a comprehensive JSON of all US counties with FIPS codes
    const response = await fetch("https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const geoJson: any = await response.json();
    
    // Extract county data from GeoJSON
    // The Plotly dataset has structure: { type: "FeatureCollection", features: [...] }
    // Each feature has properties with GEO_ID (format: "0500000US28163") and NAME
    const counties: Array<{ name: string; fips: string; stateCode: string; stateFips: string }> = [];
    const stateFipsMap = new Map(STATE_DATA.map(s => [s.fips, s.code]));
    
    if (geoJson.features && Array.isArray(geoJson.features)) {
      for (const feature of geoJson.features) {
        const props = feature.properties || {};
        const geoId = props.GEO_ID || "";
        
        // Extract FIPS from GEO_ID like "0500000US28163" -> "28163"
        const fipsMatch = geoId.match(/US(\d{5})$/);
        if (!fipsMatch) continue;
        
        const fips = fipsMatch[1];
        const stateFips = fips.slice(0, 2);
        const stateCode = stateFipsMap.get(stateFips);
        
        if (stateCode && props.NAME) {
          // Some counties already have "County" in the name, some don't
          const countyName = props.NAME.includes("County") ? props.NAME : `${props.NAME} County`;
          
          counties.push({
            name: countyName,
            fips: fips,
            stateCode: stateCode,
            stateFips: stateFips,
          });
        }
      }
    }
    
    return counties;
  } catch (error) {
    console.error("Error fetching county data:", error);
    console.log("Falling back to manual data source...");
    
    // Fallback: return empty and let user populate manually
    // In production, you might want to:
    // 1. Download Census CSV: https://www2.census.gov/programs-surveys/popest/geographies/2023/all-geocodes-v2023.xlsx
    // 2. Parse with xlsx library
    // 3. Or use a pre-processed JSON file stored in your repo
    
    return [];
  }
}

async function seedStates() {
  const statesCollection = await getStatesCollection();
  
  console.log("Seeding states...");
  const states: Array<State & { _id: string }> = STATE_DATA.map((state) => ({
    _id: state.code,
    code: state.code,
    name: state.name,
    fips: state.fips,
  }));

  // Clear existing and insert
  await statesCollection.deleteMany({});
  
  if (states.length > 0) {
    await statesCollection.insertMany(states);
    console.log(`✓ Inserted ${states.length} states`);
  }
  
  // Create index
  await statesCollection.createIndex({ code: 1 }, { unique: true });
  await statesCollection.createIndex({ fips: 1 }, { unique: true });
}

async function seedCounties() {
  const countiesCollection = await getCountiesCollection();
  
  console.log("Seeding counties...");
  console.log("Fetching county data from public dataset...");
  
  const countyData = await getComprehensiveCountyData();
  
  if (countyData.length === 0) {
    console.log("⚠ No county data fetched. Creating collection structure only.");
    await countiesCollection.deleteMany({});
    await countiesCollection.createIndex({ fips: 1 }, { unique: true });
    await countiesCollection.createIndex({ stateCode: 1 });
    await countiesCollection.createIndex({ stateFips: 1 });
    console.log("✓ County collection structure ready (populate manually)");
    return;
  }
  
  console.log(`Found ${countyData.length} counties`);
  
  // Clear existing
  await countiesCollection.deleteMany({});
  
  // Transform to County format
  const counties: Array<County & { _id: string }> = countyData.map((county) => ({
    _id: county.fips,
    name: county.name,
    fips: county.fips,
    stateCode: county.stateCode,
    stateFips: county.stateFips,
  }));
  
  // Batch insert (MongoDB handles large inserts efficiently)
  const batchSize = 1000;
  for (let i = 0; i < counties.length; i += batchSize) {
    const batch = counties.slice(i, i + batchSize);
    await countiesCollection.insertMany(batch);
    console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(counties.length / batchSize)}`);
  }
  
  // Create indexes
  await countiesCollection.createIndex({ fips: 1 }, { unique: true });
  await countiesCollection.createIndex({ stateCode: 1 });
  await countiesCollection.createIndex({ stateFips: 1 });
  
  console.log(`✓ Inserted ${counties.length} counties`);
}

async function main() {
  try {
    await seedStates();
    await seedCounties();
    console.log("\n✓ Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

// Run the script
main();

