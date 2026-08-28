/**
 * Tool Registry (spec §11).
 *
 * Tools retrieve data or perform deterministic operations.
 * Agents reason over tool results — they never bypass them.
 */

import { db } from "@/shared/db";
import { haversineMeters } from "@/shared/utils";
import type { TaskDTO, UserContext } from "@/shared/types";
import {
  calculateHousingCost,
  calculateMoveInCost,
  evaluateAffordability,
} from "@/tools/calculator/housing-calculator";
import { getLocationProvider } from "@/tools/maps";
import type { PlaceCategory, PlaceResult } from "@/tools/maps/location-provider";
import { NoListingsProvider } from "@/tools/housing/housing-provider";
import { buildUserContext } from "@/agents/shared/user-context";

const housingProvider = new NoListingsProvider();

export const tools = {
  /** Loads the shared structured user state every agent reasons over. */
  getUserContext(userId: string): Promise<UserContext> {
    return buildUserContext(userId);
  },

  getTasks: (userId: string) =>
    db.task.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),

  createTask: (input: {
    userId: string;
    title: string;
    description?: string;
    reason?: string;
    priority?: TaskDTO["priority"];
    phase?: TaskDTO["phase"];
    category?: string;
    estimateMinutes?: number;
    dueDate?: Date;
    source?: "PLAN" | "USER";
  }) =>
    db.task.create({
      data: {
        userId: input.userId,
        title: input.title,
        description: input.description,
        reason: input.reason,
        priority: input.priority ?? "MEDIUM",
        phase: input.phase ?? "BEFORE_ARRIVAL",
        category: input.category,
        estimateMinutes: input.estimateMinutes,
        dueDate: input.dueDate,
        source: input.source ?? "USER",
      },
    }),

  completeTask: (userId: string, taskId: string) =>
    db.task.updateMany({
      where: { id: taskId, userId },
      data: { status: "DONE", completedAt: new Date() },
    }),

  reopenTask: (userId: string, taskId: string) =>
    db.task.updateMany({
      where: { id: taskId, userId },
      data: { status: "OPEN", completedAt: null },
    }),

  // Deterministic calculators (spec §21) ------------------------------
  calculateHousingCost,
  calculateMoveInCost,
  evaluateAffordability,

  // Maps / places ------------------------------------------------------
  searchPlaces: async (
    anchor: { lat: number; lng: number },
    category: PlaceCategory,
    radiusMeters = 3000,
  ): Promise<PlaceResult[]> => {
    const provider = getLocationProvider();
    return provider.searchNearby(anchor, category, radiusMeters);
  },

  calculateDistance: (
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ): number => haversineMeters(a.lat, a.lng, b.lat, b.lng),

  geocode: (address: string) => getLocationProvider().geocode(address),

  // Housing data (no invented listings — see NoListingsProvider) -------
  searchHousing: (query: { destination: string; maxRent?: number }) =>
    housingProvider.searchListings(query),
};

export type ToolRegistry = typeof tools;
