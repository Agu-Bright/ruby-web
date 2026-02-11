// ============================================================
// Location data powered by country-state-city package
// Filtered to African countries only
// ============================================================

import { Country, State, City } from 'country-state-city';
import type { ICountry, IState, ICity } from 'country-state-city';

// African ISO codes
const AFRICAN_CODES = new Set([
  'DZ','AO','BJ','BW','BF','BI','CM','CV','CF','TD','KM','CG','CD','CI',
  'DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR',
  'LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN',
  'SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW',
]);

// ─── Countries ───────────────────────────────────────────────

export function getAfricanCountries(): ICountry[] {
  return Country.getAllCountries().filter(c => AFRICAN_CODES.has(c.isoCode));
}

export function getCountryByCode(code: string): ICountry | undefined {
  const country = Country.getCountryByCode(code);
  if (!country || !AFRICAN_CODES.has(country.isoCode)) return undefined;
  return country;
}

// ─── States ──────────────────────────────────────────────────

export function getStatesOfCountry(countryCode: string): IState[] {
  return State.getStatesOfCountry(countryCode);
}

export function getStateByCode(countryCode: string, stateCode: string): IState | undefined {
  const states = State.getStatesOfCountry(countryCode);
  return states.find(s => s.isoCode === stateCode);
}

// ─── Cities ──────────────────────────────────────────────────

export function getCitiesOfState(countryCode: string, stateCode: string): ICity[] {
  return City.getCitiesOfState(countryCode, stateCode);
}

// ─── Language map (for auto-fill) ────────────────────────────

const COUNTRY_LANGUAGES: Record<string, string> = {
  NG: 'en', GH: 'en', KE: 'en', ZA: 'en', EG: 'ar', ET: 'am', TZ: 'sw',
  UG: 'en', RW: 'en', SN: 'fr', CI: 'fr', CM: 'fr', MA: 'ar', TN: 'ar',
  AO: 'pt', MZ: 'pt', DZ: 'ar', SD: 'ar', CD: 'fr', ML: 'fr', NE: 'fr',
  BF: 'fr', TD: 'fr', SO: 'so', ZM: 'en', ZW: 'en', MW: 'en', MG: 'fr',
  BJ: 'fr', TG: 'fr', SL: 'en', LR: 'en', GM: 'en', GA: 'fr', BW: 'en',
  NA: 'en', MU: 'en', LY: 'ar', GN: 'fr', CG: 'fr', ER: 'ti', LS: 'en',
  SZ: 'en', DJ: 'fr', GW: 'pt', CV: 'pt', KM: 'fr', ST: 'pt', SC: 'en',
  BI: 'fr', SS: 'en', CF: 'fr', GQ: 'es', MR: 'ar',
};

export function getLanguageForCountry(code: string): string {
  return COUNTRY_LANGUAGES[code] || 'en';
}

// ─── Static dropdown data (currencies & languages) ───────────

export const ALL_CURRENCIES: { code: string; name: string }[] = [
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'ETB', name: 'Ethiopian Birr' },
  { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'UGX', name: 'Ugandan Shilling' },
  { code: 'RWF', name: 'Rwandan Franc' },
  { code: 'XOF', name: 'CFA Franc (West)' },
  { code: 'XAF', name: 'CFA Franc (Central)' },
  { code: 'MAD', name: 'Moroccan Dirham' },
  { code: 'TND', name: 'Tunisian Dinar' },
  { code: 'AOA', name: 'Angolan Kwanza' },
  { code: 'MZN', name: 'Mozambican Metical' },
  { code: 'DZD', name: 'Algerian Dinar' },
  { code: 'SDG', name: 'Sudanese Pound' },
  { code: 'CDF', name: 'Congolese Franc' },
  { code: 'SOS', name: 'Somali Shilling' },
  { code: 'ZMW', name: 'Zambian Kwacha' },
  { code: 'ZWL', name: 'Zimbabwean Dollar' },
  { code: 'MWK', name: 'Malawian Kwacha' },
  { code: 'MGA', name: 'Malagasy Ariary' },
  { code: 'SLE', name: 'Sierra Leonean Leone' },
  { code: 'LRD', name: 'Liberian Dollar' },
  { code: 'GMD', name: 'Gambian Dalasi' },
  { code: 'BWP', name: 'Botswana Pula' },
  { code: 'NAD', name: 'Namibian Dollar' },
  { code: 'MUR', name: 'Mauritian Rupee' },
  { code: 'LYD', name: 'Libyan Dinar' },
  { code: 'GNF', name: 'Guinean Franc' },
  { code: 'ERN', name: 'Eritrean Nakfa' },
  { code: 'LSL', name: 'Lesotho Loti' },
  { code: 'SZL', name: 'Eswatini Lilangeni' },
  { code: 'DJF', name: 'Djiboutian Franc' },
  { code: 'CVE', name: 'Cape Verdean Escudo' },
  { code: 'KMF', name: 'Comorian Franc' },
  { code: 'STN', name: 'Sao Tome Dobra' },
  { code: 'SCR', name: 'Seychellois Rupee' },
  { code: 'BIF', name: 'Burundian Franc' },
  { code: 'SSP', name: 'South Sudanese Pound' },
  { code: 'MRU', name: 'Mauritanian Ouguiya' },
  { code: 'USD', name: 'US Dollar' },
];

export const ALL_LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'ar', name: 'Arabic' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'sw', name: 'Swahili' },
  { code: 'am', name: 'Amharic' },
  { code: 'ha', name: 'Hausa' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'ig', name: 'Igbo' },
  { code: 'so', name: 'Somali' },
  { code: 'ti', name: 'Tigrinya' },
  { code: 'es', name: 'Spanish' },
  { code: 'zu', name: 'Zulu' },
  { code: 'xh', name: 'Xhosa' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'mg', name: 'Malagasy' },
  { code: 'rw', name: 'Kinyarwanda' },
  { code: 'sn', name: 'Shona' },
  { code: 'ny', name: 'Chichewa' },
  { code: 'wo', name: 'Wolof' },
  { code: 'ln', name: 'Lingala' },
];
