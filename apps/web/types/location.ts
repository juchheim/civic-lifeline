export type LocationSuggestion = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: string;
};

export type LocationSelection = {
  label: string;
  lat: number;
  lon: number;
  postalCode?: string;
};

