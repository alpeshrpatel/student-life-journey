import { describe, expect, it } from "vitest";
import { computeFirstPriority } from "./first-priority.js";

const searching = (daysUntilArrival: number, destination = "Phoenix") =>
  computeFirstPriority({ housingStatus: "SEARCHING", daysUntilArrival, destination });
const secured = (daysUntilArrival: number) =>
  computeFirstPriority({ housingStatus: "SECURED", daysUntilArrival, destination: "Phoenix" });

describe("computeFirstPriority", () => {
  it("rule 1 / AC1: searching with days to go is a critical housing task", () => {
    const item = searching(12);
    expect(item).toMatchObject({
      key: "housing.find",
      title: "Find housing",
      priority: "CRITICAL",
      category: "HOUSING",
    });
    expect(item.reason).toBe(
      "You arrive in Phoenix in 12 days without secured housing — this blocks everything else.",
    );
  });

  it("rule 1: arriving today uses the today wording", () => {
    expect(searching(0).reason).toBe(
      "You arrive in Phoenix today without secured housing — make this today's focus.",
    );
    expect(searching(0).key).toBe("housing.find");
  });

  it("rule 2: searching after arrival is still critical", () => {
    const item = searching(-1);
    expect(item).toMatchObject({ key: "housing.find", priority: "CRITICAL", category: "HOUSING" });
    expect(item.reason).toBe(
      "You are in Phoenix without secured housing — make this today's focus.",
    );
  });

  it("rule 3 / AC2: secured and within 14 days is airport transportation", () => {
    for (const n of [0, 1, 14]) {
      expect(secured(n)).toMatchObject({
        key: "arrival.airport_transport",
        title: "Arrange airport transportation",
        priority: "HIGH",
        category: "TRAVEL",
        reason: "Arrival is close — decide how you get from the airport to your new home.",
      });
    }
  });

  it("rule 4 / AC2: secured and more than 14 days is confirming move-in", () => {
    for (const n of [15, 90]) {
      expect(secured(n)).toMatchObject({
        key: "housing.confirm_move_in",
        title: "Confirm move-in details and keys",
        priority: "HIGH",
        category: "HOUSING",
        reason:
          "Confirm entry instructions, keys and what is included to avoid arrival-day surprises.",
      });
    }
  });

  it("rule 5 / AC3: secured and already arrived is finding the essentials", () => {
    for (const n of [-1, -3]) {
      expect(secured(n)).toMatchObject({
        key: "places.find_essentials",
        title: "Find groceries and a pharmacy near home",
        priority: "MEDIUM",
        category: "DAILY_LIVING",
        reason: "Knowing where the basics are makes the first week easier.",
      });
    }
  });

  it("AC4: one day is singular", () => {
    const reason = searching(1).reason;
    expect(reason).toContain("in 1 day without");
    expect(reason).not.toContain("1 days");
  });

  it("keeps a destination with spaces intact", () => {
    expect(searching(5, "San Francisco Bay Area").reason).toContain(
      "in San Francisco Bay Area in 5 days",
    );
  });
});
