/**
 * HousingProvider interface (spec §16).
 *
 * The MVP intentionally has NO listing marketplace integration. Per spec §23
 * we must NEVER invent listings, availability or prices — so until a real
 * provider is connected, this provider returns an empty result set with an
 * explicit notice instead of fabricating data.
 */

export interface HousingListing {
  externalId: string;
  title: string;
  address: string;
  rent: number;
  source: string;
  verified: boolean;
  url?: string;
}

export interface HousingSearchResult {
  listings: HousingListing[];
  notice: string | null;
  providerKind: string;
}

export interface HousingProvider {
  readonly kind: string;
  searchListings(query: {
    destination: string;
    maxRent?: number;
  }): Promise<HousingSearchResult>;
  getListing(id: string): Promise<HousingListing | null>;
}

export class NoListingsProvider implements HousingProvider {
  readonly kind = "none";

  async searchListings(): Promise<HousingSearchResult> {
    return {
      listings: [],
      providerKind: this.kind,
      notice:
        "Live housing listings are not integrated in this MVP. Add a HousingProvider implementation (e.g., a listings marketplace API) to enable search — we will not show invented results.",
    };
  }

  async getListing(): Promise<HousingListing | null> {
    return null;
  }
}
