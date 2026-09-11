export interface CountryInfo {
  code: string; // ISO 3166-1 alpha-2 (e.g. 'AR', 'PE')
  name: string;
  currency: string; // ISO 4217 (e.g. 'ARS', 'PEN', 'USD')
  symbol: string;
  phonePrefix: string; // e.g. '54', '51', '56'
  flagUrl: string;
  dniLabel: string; // e.g. 'DNI / CUIT', 'DNI / RUC', 'RUT / RUN', 'Cédula / NIT'
  dniPlaceholder: string;
  isEuro?: boolean;
}

export const COUNTRIES_CONFIG: Record<string, CountryInfo> = {
  AR: {
    code: 'AR',
    name: 'Argentina',
    currency: 'ARS',
    symbol: '$',
    phonePrefix: '54',
    flagUrl: 'https://flagcdn.com/w40/ar.png',
    dniLabel: 'DNI / CUIT',
    dniPlaceholder: 'Ej: 38.123.456 / 20-38123456-7'
  },
  PE: {
    code: 'PE',
    name: 'Perú',
    currency: 'PEN',
    symbol: 'S/.',
    phonePrefix: '51',
    flagUrl: 'https://flagcdn.com/w40/pe.png',
    dniLabel: 'DNI / RUC',
    dniPlaceholder: 'Ej: 72345678 / 20123456789'
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    currency: 'CLP',
    symbol: '$',
    phonePrefix: '56',
    flagUrl: 'https://flagcdn.com/w40/cl.png',
    dniLabel: 'RUT / RUN',
    dniPlaceholder: 'Ej: 12.345.678-K'
  },
  CO: {
    code: 'CO',
    name: 'Colombia',
    currency: 'COP',
    symbol: '$',
    phonePrefix: '57',
    flagUrl: 'https://flagcdn.com/w40/co.png',
    dniLabel: 'Cédula (CC) / NIT',
    dniPlaceholder: 'Ej: 1.020.345.678'
  },
  VE: {
    code: 'VE',
    name: 'Venezuela',
    currency: 'USD',
    symbol: '$',
    phonePrefix: '58',
    flagUrl: 'https://flagcdn.com/w40/ve.png',
    dniLabel: 'Cédula (CI) / RIF',
    dniPlaceholder: 'Ej: V-18.456.789 / J-12345678-0'
  },
  MX: {
    code: 'MX',
    name: 'México',
    currency: 'MXN',
    symbol: '$',
    phonePrefix: '52',
    flagUrl: 'https://flagcdn.com/w40/mx.png',
    dniLabel: 'RFC / CURP',
    dniPlaceholder: 'Ej: ABCD123456XYZ'
  },
  UY: {
    code: 'UY',
    name: 'Uruguay',
    currency: 'UYU',
    symbol: '$',
    phonePrefix: '598',
    flagUrl: 'https://flagcdn.com/w40/uy.png',
    dniLabel: 'Cédula de Identidad / RUT',
    dniPlaceholder: 'Ej: 1.234.567-8'
  },
  BR: {
    code: 'BR',
    name: 'Brasil',
    currency: 'BRL',
    symbol: 'R$',
    phonePrefix: '55',
    flagUrl: 'https://flagcdn.com/w40/br.png',
    dniLabel: 'CPF / CNPJ',
    dniPlaceholder: 'Ej: 123.456.789-00'
  },
  EC: {
    code: 'EC',
    name: 'Ecuador',
    currency: 'USD',
    symbol: '$',
    phonePrefix: '593',
    flagUrl: 'https://flagcdn.com/w40/ec.png',
    dniLabel: 'Cédula / RUC',
    dniPlaceholder: 'Ej: 1712345678'
  },
  PA: {
    code: 'PA',
    name: 'Panamá',
    currency: 'USD',
    symbol: '$',
    phonePrefix: '507',
    flagUrl: 'https://flagcdn.com/w40/pa.png',
    dniLabel: 'Cédula / RUC',
    dniPlaceholder: 'Ej: 8-123-4567'
  },
  PY: {
    code: 'PY',
    name: 'Paraguay',
    currency: 'PYG',
    symbol: '₲',
    phonePrefix: '595',
    flagUrl: 'https://flagcdn.com/w40/py.png',
    dniLabel: 'Cédula de Identidad / RUC',
    dniPlaceholder: 'Ej: 1.234.567'
  },
  BO: {
    code: 'BO',
    name: 'Bolivia',
    currency: 'BOB',
    symbol: 'Bs.',
    phonePrefix: '591',
    flagUrl: 'https://flagcdn.com/w40/bo.png',
    dniLabel: 'Cédula de Identidad / NIT',
    dniPlaceholder: 'Ej: 1234567 LP'
  },
  ES: {
    code: 'ES',
    name: 'España',
    currency: 'EUR',
    symbol: '€',
    phonePrefix: '34',
    flagUrl: 'https://flagcdn.com/w40/es.png',
    dniLabel: 'DNI / NIE / CIF',
    dniPlaceholder: 'Ej: 12345678Z'
  },
  US: {
    code: 'US',
    name: 'Estados Unidos',
    currency: 'USD',
    symbol: '$',
    phonePrefix: '1',
    flagUrl: 'https://flagcdn.com/w40/us.png',
    dniLabel: 'Tax ID / SSN / EIN',
    dniPlaceholder: 'Ej: 12-3456789'
  }
};

export const COUNTRIES_LIST = Object.values(COUNTRIES_CONFIG);

export const DEFAULT_USD_RATES: Record<string, number> = {
  AR: 1200,
  CO: 4100,
  CL: 940,
  PE: 3.8,
  MX: 18.5,
  UY: 40,
  VE: 1.0,
  ES: 0.92,
  US: 1.0,
  BR: 5.5,
  PY: 7500,
  BO: 6.9,
  EC: 1.0,
  PA: 1.0,
};

export function getCountryByCode(code?: string | null): CountryInfo {
  if (!code) return COUNTRIES_CONFIG.AR;
  const upper = code.toUpperCase();
  return COUNTRIES_CONFIG[upper] || COUNTRIES_CONFIG.AR;
}
