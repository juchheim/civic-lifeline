export interface County { name: string; fips: string }

export const MS_COUNTIES: County[] = [
  { name: "Hinds County", fips: "28049" },
  { name: "Yazoo County", fips: "28163" },
  { name: "Harrison County", fips: "28047" },
  { name: "Jackson County", fips: "28059" },
  { name: "Rankin County", fips: "28121" },
  { name: "Madison County", fips: "28089" },
  { name: "DeSoto County", fips: "28033" },
  { name: "Forrest County", fips: "28035" },
  { name: "Lafayette County", fips: "28071" },
  { name: "Lee County", fips: "28081" }
].sort((a, b) => a.name.localeCompare(b.name));
