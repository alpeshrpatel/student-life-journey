import { formatMoney } from "@/shared/utils";
import type { UserContext } from "@/shared/types";
import type { AIRequest, ChatResponse } from "@/ai/ai-service";

/** Deterministic concierge replies grounded in real user state. */

interface HousingEvalShape {
  verdict?: "COMPATIBLE" | "TIGHT" | "OVER";
  monthlyTotal?: number;
  moveInTotal?: number;
  referenceBudget?: number;
  rentShareOfBudget?: number;
}

interface ConciergePayload {
  intent?: string;
  userContext?: UserContext;
  data?: {
    topTasks?: { title: string; priority: string }[];
    evaluation?: HousingEvalShape;
    places?: { name: string; address: string }[];
    placeCategory?: string;
  };
}

function list(items: string[]): string {
  return items.map((t, i) => `${i + 1}. ${t}`).join("\n");
}

export function buildConciergeReply(request: AIRequest): ChatResponse {
  const payload = request.context as ConciergePayload;
  const ctx = payload.userContext;
  const data = payload.data ?? {};
  const intent = payload.intent ?? "GENERAL";
  const dest = ctx?.relocation.destination ?? "your new city";
  const days = ctx?.daysUntilArrival ?? 0;

  const openTasks = (ctx?.tasks ?? []).filter((t) => t.status === "OPEN");

  switch (intent) {
    case "TODAY_PLAN": {
      const top = (data.topTasks ?? openTasks.slice(0, 3)).slice(0, 3);
      const timing =
        days > 0
          ? `You arrive in ${dest} in ${days} day${days === 1 ? "" : "s"}.`
          : days === 0
            ? `It's arrival day in ${dest}!`
            : `You've been in ${dest} for ${-days} days.`;
      return {
        text: `${timing}\n\nHere's what matters most right now:\n\n${list(top.map((t) => t.title))}\n\nStart with "${top[0]?.title ?? "reviewing your plan"}" — everything else gets easier once that moves.`,
      };
    }
    case "TOP_TASKS": {
      const top = (data.topTasks ?? openTasks.slice(0, 5)).slice(0, 5);
      return {
        text: `Your most important open tasks:\n\n${list(top.map((t) => t.title))}\n\nOpen the Tasks tab to complete them and see why each one matters.`,
      };
    }
    case "AFFORDABILITY": {
      const ev = data.evaluation;
      if (!ev) {
        const hb = ctx?.housing.budget;
        const mb = ctx?.finances.monthlyBudget;
        return {
          text: `I can give a precise answer using the Housing evaluator.${hb ? ` Your housing budget is ${formatMoney(hb)}.` : ""}${mb ? ` Your total monthly budget is ${formatMoney(mb)}.` : ""}\n\nOpen the Housing tab, enter rent plus recurring costs you know (utilities, internet, transport), and I'll compute the REAL monthly cost and exact move-in cash required — then tell you if it fits.`,
        };
      }
      return {
        text: `Based on your inputs: real monthly cost ≈ ${formatMoney(ev.monthlyTotal)}, move-in cash ≈ ${formatMoney(ev.moveInTotal)}. Verdict: ${ev.verdict}.${ev.referenceBudget ? ` Compared against your ${formatMoney(ev.referenceBudget)} budget.` : ""}\n\nThese are YOUR entered estimates — verify final terms directly with the landlord before paying anything.`,
      };
    }
    case "PLACES": {
      const places = data.places ?? [];
      if (places.length === 0) {
        return {
          text: `Open the Places tab — it finds groceries, pharmacies, clinics, transit stops and laundries near ${ctx?.relocation.homeAddress ?? dest}.`,
        };
      }
      return {
        text: `Nearest options for ${(data.placeCategory ?? "essentials").toLowerCase()}:\n\n${places
          .slice(0, 4)
          .map((p) => `• ${p.name} — ${p.address}`)
          .join("\n")}\n\nTap Directions on any of them in the Places tab.`,
      };
    }
    case "SHOPPING_LIST":
      return {
        text: `For your first grocery run in ${dest}, keep it simple and cheap:\n\n• Eggs, bread, rice or pasta\n• Oats, milk (or alternative), fruit\n• Chicken/tofu + frozen vegetables\n• Salt, pepper, oil, one sauce you like\n\nThat covers about a week of basic meals. Check the Places tab for the closest store to your door.`,
      };
    case "TRANSPORTATION": {
      const prefs = ctx?.transportation.preferences ?? [];
      const prefText =
        prefs.includes("PUBLIC_TRANSIT") ? "public transit" :
        prefs.includes("WALKING") ? "walking" :
        prefs.includes("BIKE") ? "biking" :
        prefs.includes("CAR") ? "driving" :
        prefs.includes("RIDESHARE") ? "rideshares" : "public transit";
      return {
        text: `Based on your preference for ${prefText}: keep week one cheap — pay-per-ride first, test one round trip to where you'll go most often, then compare a monthly pass against what you actually spent.\n\nWant specifics? Ask me "where is the nearest transit station".`,
      };
    }
    case "FLIGHT_PREP": {
      const prep = openTasks.filter((t) =>
        ["CONNECTIVITY", "TRANSPORT", "SETUP"].includes(t.category ?? ""),
      ).slice(0, 3);
      const base = [
        "Phone connectivity sorted (eSIM installed or roaming confirmed)",
        "Airport → home ride planned",
        "Documents ready: passport/ID, entry letter, address written down",
        `Offline maps of ${dest} downloaded`,
      ];
      return {
        text: `Before your flight to ${dest}, lock in:\n\n${list(base)}${prep.length ? `\n\nFrom your own task list:\n${list(prep.map((t) => t.title))}` : ""}`,
      };
    }
    default:
      return {
        text: `Here's where things stand: ${days > 0 ? `arriving in ${dest} in ${days} days` : `settling into ${dest}`}, housing ${ctx?.housing.status.toLowerCase() ?? "unknown"}, ${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}.\n\nYou can ask me:\n• "What should I do today?"\n• "Can I afford this apartment?"\n• "Where can I buy groceries?"\n• "What should I prepare before my flight?"`,
      };
  }
}
