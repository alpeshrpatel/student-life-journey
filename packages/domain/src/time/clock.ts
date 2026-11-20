/** Source of the current time, injected by callers so domain code stays pure. */
export interface Clock {
  /** Epoch milliseconds. */
  now(): number;
}
