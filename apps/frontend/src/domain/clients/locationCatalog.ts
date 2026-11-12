type LocationEntry = {
  country: string;
  state: string;
  city: string;
  postalCodes: string[];
  colonias: string[];
};

const LOCATIONS: LocationEntry[] = [
  {
    country: "México",
    state: "CDMX",
    city: "Ciudad de México",
    postalCodes: ["01000", "03000", "06000"],
    colonias: ["Centro", "Roma Norte", "Del Valle", "Condesa"],
  },
  {
    country: "México",
    state: "Jalisco",
    city: "Guadalajara",
    postalCodes: ["44100", "44200", "44600"],
    colonias: ["Americana", "Providencia", "Centro", "Ladrón de Guevara"],
  },
  {
    country: "México",
    state: "Jalisco",
    city: "Zapopan",
    postalCodes: ["45010", "45100", "45200"],
    colonias: ["Chapalita", "Ciudad del Sol", "Jardines Universidad"],
  },
  {
    country: "México",
    state: "Nuevo León",
    city: "Monterrey",
    postalCodes: ["64000", "64100", "64500"],
    colonias: ["Obispado", "Centro", "Contry", "Mitras Centro"],
  },
  {
    country: "México",
    state: "Nuevo León",
    city: "San Pedro Garza García",
    postalCodes: ["66220", "66260"],
    colonias: ["Del Valle", "Fuentes del Valle", "Santa Engracia"],
  },
  {
    country: "México",
    state: "Puebla",
    city: "Puebla",
    postalCodes: ["72000", "72160"],
    colonias: ["La Paz", "Centro", "Huexotitla"],
  },
  {
    country: "México",
    state: "Querétaro",
    city: "Santiago de Querétaro",
    postalCodes: ["76000", "76100"],
    colonias: ["Centro Sur", "Carretas", "Jardines de Querétaro"],
  },
  {
    country: "México",
    state: "Guanajuato",
    city: "León",
    postalCodes: ["37000", "37100"],
    colonias: ["Centro", "Jardines del Moral", "San Isidro"],
  },
  {
    country: "México",
    state: "Baja California",
    city: "Tijuana",
    postalCodes: ["22000", "22100"],
    colonias: ["Zona Centro", "Hipódromo", "Libertad"],
  },
  {
    country: "México",
    state: "Yucatán",
    city: "Mérida",
    postalCodes: ["97000", "97100"],
    colonias: ["Centro", "García Ginerés", "Montecristo"],
  },
];

const getUniqueValues = (values: string[]) =>
  Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "es"));

export const getCountries = () =>
  getUniqueValues(LOCATIONS.map((entry) => entry.country));

export const getStatesByCountry = (country: string) =>
  getUniqueValues(
    LOCATIONS.filter((entry) => entry.country === country).map(
      (entry) => entry.state,
    ),
  );

export const getCitiesByCountryAndState = (country: string, state: string) =>
  getUniqueValues(
    LOCATIONS.filter(
      (entry) => entry.country === country && entry.state === state,
    ).map((entry) => entry.city),
  );

export const getPostalCodesByLocation = (
  country?: string,
  state?: string,
  city?: string,
) => {
  return getUniqueValues(
    LOCATIONS.filter((entry) => {
      if (country && entry.country !== country) return false;
      if (state && entry.state !== state) return false;
      if (city && entry.city !== city) return false;
      return true;
    }).flatMap((entry) => entry.postalCodes),
  );
};

export const getColoniasByLocation = (
  country?: string,
  state?: string,
  city?: string,
  postalCode?: string,
) => {
  return getUniqueValues(
    LOCATIONS.filter((entry) => {
      if (country && entry.country !== country) return false;
      if (state && entry.state !== state) return false;
      if (city && entry.city !== city) return false;
      if (postalCode && !entry.postalCodes.includes(postalCode)) return false;
      return true;
    }).flatMap((entry) => entry.colonias),
  );
};

export const findLocationByPostalCode = (postalCode: string) => {
  const normalizedPostalCode = postalCode.trim();
  if (!normalizedPostalCode) {
    return null;
  }

  const match = LOCATIONS.find((entry) =>
    entry.postalCodes.includes(normalizedPostalCode),
  );
  if (!match) {
    return null;
  }

  return {
    country: match.country,
    state: match.state,
    city: match.city,
    colonias: match.colonias,
  };
};
