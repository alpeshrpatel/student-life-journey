import type { Clock, IdGenerator } from "@slj/domain";
import type { ExecutionContext } from "hono";
import { type AppEnv, parseEnv } from "../config/env.js";
import { createDb, type Db } from "../infra/db/client.js";
import { countingD1 } from "../infra/db/counting-d1.js";
import { DrizzleRelocationRepository } from "../infra/db/repositories/relocation-repository.js";
import type { RelocationRepository } from "../modules/relocation/ports.js";
import { systemClock } from "../shared/clock.js";
import { uuidGenerator } from "../shared/ids.js";

export interface Container {
  env: AppEnv;
  db: Db;
  clock: Clock;
  ids: IdGenerator;
  relocationRepo: RelocationRepository;
  dbCalls(): number;
}

/** Composition root: wires the validated config and infrastructure for one request. */
export function buildContainer(rawEnv: Env, ctx: ExecutionContext): Container {
  void ctx; // reserved for `ctx.waitUntil` once background work exists
  const env = parseEnv({ ...rawEnv });
  const counting = countingD1(rawEnv.DB);
  const db = createDb(counting.d1);
  return {
    env,
    db,
    clock: systemClock,
    ids: uuidGenerator,
    relocationRepo: new DrizzleRelocationRepository(db),
    dbCalls: () => counting.calls(),
  };
}
