export interface IngestableItem {
  externalId: string;
  title: string;
  content: string | null;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
  rawData: string;
}

const BASE_URL = "https://api.company-information.service.gov.uk";

function getAuthHeaders(): Record<string, string> | null {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) {
    return null;
  }
  const encoded = Buffer.from(`${apiKey}:`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

async function apiFetch<T>(path: string): Promise<T | null> {
  const headers = getAuthHeaders();
  if (!headers) {
    console.warn(
      "COMPANIES_HOUSE_API_KEY not set. Get a free key at https://developer.company-information.service.gov.uk/"
    );
    return null;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { ...headers, Accept: "application/json" },
  });

  if (response.status === 429) {
    console.warn(
      "Companies House API rate limit hit (600 req / 5 min). Skipping."
    );
    return null;
  }

  if (!response.ok) {
    console.error(
      `Companies House API error: ${response.status} ${response.statusText} for ${path}`
    );
    return null;
  }

  return response.json() as Promise<T>;
}

// --- API response types ---

interface CompanySearchResponse {
  items: Array<{
    company_number: string;
    title: string;
    company_status: string;
    date_of_creation: string;
    address_snippet: string;
  }>;
}

interface FilingHistoryResponse {
  items: Array<{
    transaction_id: string;
    category: string;
    type: string;
    date: string;
    description: string;
    description_values?: Record<string, string>;
  }>;
}

interface OfficersResponse {
  items: Array<{
    name: string;
    officer_role: string;
    appointed_on: string;
    resigned_on?: string;
    links: { self: string };
    occupation?: string;
    nationality?: string;
  }>;
}

// --- Helper to resolve a company number from name or number ---

async function resolveCompanyNumber(
  nameOrNumber: string
): Promise<{ number: string; name: string } | null> {
  // If it looks like a company number (all digits, or 2 letters + digits), use directly
  if (/^[A-Z]{0,2}\d{5,8}$/i.test(nameOrNumber.trim())) {
    return { number: nameOrNumber.trim().toUpperCase(), name: nameOrNumber };
  }

  const params = new URLSearchParams({ q: nameOrNumber, items_per_page: "1" });
  const data = await apiFetch<CompanySearchResponse>(
    `/search/companies?${params.toString()}`
  );

  if (!data || data.items.length === 0) {
    console.warn(`No company found for query: "${nameOrNumber}"`);
    return null;
  }

  const match = data.items[0];
  return { number: match.company_number, name: match.title };
}

// --- Public exports ---

/**
 * Fetch recent filing history for a company from Companies House.
 * Pass either a company name (will search) or company number directly.
 */
export async function fetchCompaniesHouseFilings(
  nameOrNumber: string,
  options: { itemsPerPage?: number } = {}
): Promise<IngestableItem[]> {
  try {
    const company = await resolveCompanyNumber(nameOrNumber);
    if (!company) return [];

    const itemsPerPage = options.itemsPerPage || 10;
    const params = new URLSearchParams({
      items_per_page: String(itemsPerPage),
    });

    const data = await apiFetch<FilingHistoryResponse>(
      `/company/${company.number}/filing-history?${params.toString()}`
    );

    if (!data || !data.items) return [];

    return data.items.map((filing) => ({
      externalId: `ch-${company.number}-${filing.transaction_id}`,
      title: `Company filing: ${filing.description} for ${company.name}`,
      content: [
        `Category: ${filing.category}`,
        `Type: ${filing.type}`,
        `Date: ${filing.date}`,
        `Description: ${filing.description}`,
        filing.description_values
          ? `Details: ${JSON.stringify(filing.description_values)}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
      url: `https://find-and-update.company-information.service.gov.uk/company/${company.number}/filing-history/${filing.transaction_id}`,
      author: null,
      publishedAt: filing.date ? new Date(filing.date) : null,
      rawData: JSON.stringify(filing),
    }));
  } catch (error) {
    console.error("Failed to fetch Companies House filings", error);
    return [];
  }
}

/**
 * Fetch recent officer appointments/resignations for a company.
 * Useful for detecting board-level changes at competitors.
 */
export async function fetchCompaniesHouseOfficers(
  nameOrNumber: string,
  options: { itemsPerPage?: number } = {}
): Promise<IngestableItem[]> {
  try {
    const company = await resolveCompanyNumber(nameOrNumber);
    if (!company) return [];

    const itemsPerPage = options.itemsPerPage || 10;
    const params = new URLSearchParams({
      items_per_page: String(itemsPerPage),
      order_by: "appointed_on",
    });

    const data = await apiFetch<OfficersResponse>(
      `/company/${company.number}/officers?${params.toString()}`
    );

    if (!data || !data.items) return [];

    return data.items.map((officer) => {
      const status = officer.resigned_on ? "Resigned" : "Active";
      const dateKey = officer.resigned_on || officer.appointed_on;

      return {
        externalId: `ch-officer-${company.number}-${officer.name.replace(/\s+/g, "-").toLowerCase()}-${officer.appointed_on}`,
        title: `Officer change: ${officer.name} (${officer.officer_role}) at ${company.name}`,
        content: [
          `Name: ${officer.name}`,
          `Role: ${officer.officer_role}`,
          `Status: ${status}`,
          `Appointed: ${officer.appointed_on}`,
          officer.resigned_on ? `Resigned: ${officer.resigned_on}` : null,
          officer.occupation ? `Occupation: ${officer.occupation}` : null,
          officer.nationality ? `Nationality: ${officer.nationality}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        url: `https://find-and-update.company-information.service.gov.uk/company/${company.number}/officers`,
        author: null,
        publishedAt: dateKey ? new Date(dateKey) : null,
        rawData: JSON.stringify(officer),
      };
    });
  } catch (error) {
    console.error("Failed to fetch Companies House officers", error);
    return [];
  }
}
