import type { Clock } from "@slj/domain";

export const systemClock: Clock = {
  now: () => Date.now(),
};
