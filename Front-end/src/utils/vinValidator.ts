// Pesos por posição (ISO 3779 / NHTSA)
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

// Valor numérico de cada caractere permitido
const CHAR_VALUES: Record<string, number> = {
  A:1, B:2, C:3, D:4, E:5, F:6, G:7, H:8,
  J:1, K:2, L:3, M:4, N:5,
  P:7, R:9,
  S:2, T:3, U:4, V:5, W:6, X:7, Y:8, Z:9,
  '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
};

// Código de ano modelo na posição 10 (índice 9)
const YEAR_CODES: Record<string, number> = {
  A:2010, B:2011, C:2012, D:2013, E:2014, F:2015,
  G:2016, H:2017, J:2018, K:2019, L:2020, M:2021,
  N:2022, P:2023, R:2024, S:2025, T:2026, V:2027,
  '1':2001,'2':2002,'3':2003,'4':2004,'5':2005,
  '6':2006,'7':2007,'8':2008,'9':2009, Y:2000,
};

// WMIs com produção local no Brasil (ISO 3779)
export const BRAZILIAN_WMIS: Record<string, { manufacturer: string; city: string }> = {
  '9BW': { manufacturer: 'Volkswagen do Brasil',              city: 'São Bernardo do Campo - SP' },
  '9BD': { manufacturer: 'Fiat / Stellantis Brasil',          city: 'Betim - MG'                 },
  '9BF': { manufacturer: 'Ford Motor Company Brasil',         city: 'Camaçari - BA'              },
  '9BS': { manufacturer: 'GM / Chevrolet Brasil',             city: 'São Caetano do Sul - SP'    },
  '8AF': { manufacturer: 'Toyota do Brasil',                  city: 'Indaiatuba - SP'            },
  '93Y': { manufacturer: 'Honda Automóveis do Brasil',        city: 'Sumaré - SP'                },
  '9BH': { manufacturer: 'Honda Motos do Brasil',             city: 'Manaus - AM'                },
  '935': { manufacturer: 'Renault do Brasil',                 city: 'São José dos Pinhais - PR'  },
  '93H': { manufacturer: 'Hyundai Motor Brasil',              city: 'Piracicaba - SP'            },
  '9BM': { manufacturer: 'Mercedes-Benz do Brasil (carros)',  city: 'São Bernardo do Campo - SP' },
  '9BG': { manufacturer: 'Mercedes-Benz do Brasil (caminhões)', city: 'São Bernardo do Campo - SP' },
  '93R': { manufacturer: 'Nissan do Brasil',                  city: 'Resende - RJ'               },
  '9B2': { manufacturer: 'BMW do Brasil',                     city: 'Araquari - SC'              },
  '9BR': { manufacturer: 'Volvo do Brasil',                   city: 'Curitiba - PR'              },
  '9BK': { manufacturer: 'Scania Brasil',                     city: 'São Bernardo do Campo - SP' },
  '9BJ': { manufacturer: 'Agrale',                            city: 'Caxias do Sul - RS'         },
};

export interface VINInfo {
  wmi: string;
  manufacturer?: string;
  city?: string;
  modelYear?: number;
  checkDigitValid: boolean;
}

export interface VINValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: VINInfo | null;
}

function computeCheckDigit(vin: string): string {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const val = CHAR_VALUES[vin[i]];
    if (val === undefined) return '?';
    sum += val * VIN_WEIGHTS[i];
  }
  const rem = sum % 11;
  return rem === 10 ? 'X' : String(rem);
}

export function validateVIN(vin: string): VINValidationResult {
  const upper = vin.toUpperCase().trim();
  const errors: string[] = [];
  const warnings: string[] = [];

  if (upper.length !== 17) {
    errors.push(`Deve ter 17 caracteres (atual: ${upper.length})`);
    return { valid: false, errors, warnings, info: null };
  }

  for (let i = 0; i < upper.length; i++) {
    if (upper[i] === 'I' || upper[i] === 'O' || upper[i] === 'Q') {
      errors.push(`Caractere proibido '${upper[i]}' na posição ${i + 1} — I, O e Q não são permitidos pela norma ISO 3779`);
    }
  }

  if (errors.length > 0) return { valid: false, errors, warnings, info: null };

  const wmi = upper.slice(0, 3);
  const wmiInfo = BRAZILIAN_WMIS[wmi];

  if (!wmiInfo) {
    warnings.push(`WMI '${wmi}' não reconhecido como fabricante brasileiro cadastrado`);
  }

  const expectedCheck = computeCheckDigit(upper);
  const checkDigitValid = expectedCheck === upper[8];
  if (!checkDigitValid) {
    warnings.push(`Dígito verificador inválido na posição 9: esperado '${expectedCheck}', encontrado '${upper[8]}'`);
  }

  const modelYear = YEAR_CODES[upper[9]];
  if (!modelYear) {
    warnings.push(`Código de ano inválido na posição 10: '${upper[9]}'`);
  }

  return {
    valid: true,
    errors,
    warnings,
    info: {
      wmi,
      manufacturer: wmiInfo?.manufacturer,
      city: wmiInfo?.city,
      modelYear,
      checkDigitValid,
    },
  };
}
