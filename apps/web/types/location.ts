export type LocationSuggestion = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: string;
  state?: string;
  stateCode?: string;
  county?: string;
};

export type LocationSelection = {
  label: string;
  lat: number;
  lon: number;
  postalCode?: string;
  state?: string;
  stateCode?: string;
  county?: string;
};
