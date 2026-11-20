/** Source of new identifiers, injected by callers so domain code stays pure. */
export interface IdGenerator {
  next(): string;
}
