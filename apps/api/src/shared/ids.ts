import type { IdGenerator } from "@slj/domain";

export const uuidGenerator: IdGenerator = {
  next: () => crypto.randomUUID(),
};
