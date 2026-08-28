import { redirect } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  CalendarDays,
  Wallet,
  Sparkles,
  MessageCircleHeart,
  Home,
} from "lucide-react";
import { getSessionUserId } from "@/shared/auth/session";
import { isOnboarded } from "@/modules/relocation/onboarding-service";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const userId = await getSessionUserId();
  if (userId) {
    redirect((await isOnboarded(userId)) ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-16">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <MapPin className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Student Life Journey</h1>
        <p className="mt-2 text-muted-foreground">Your AI relocation companion</p>
      </div>

      <div className="rounded-2xl bg-primary/5 p-5 text-center ring-1 ring-primary/15">
        <p className="text-sm leading-relaxed text-foreground/90">
          Tell us where you&rsquo;re coming from, where you&rsquo;re going, when you
          arrive, your budget, and your basic preferences.
          <span className="mt-2 block font-semibold">
            We tell you what to do next.
          </span>
        </p>
      </div>

      <ul className="mt-8 space-y-4">
        {[
          {
            icon: Sparkles,
            title: "Personalized AI relocation plan",
            desc: "Before arrival → First 24 hours → First 7 days → Ongoing",
          },
          {
            icon: Home,
            title: "Housing & cost clarity",
            desc: "Real monthly cost + exact move-in cash needed",
          },
          {
            icon: MapPin,
            title: "Essential places near you",
            desc: "Groceries, pharmacy, healthcare, transit, laundry",
          },
          {
            icon: MessageCircleHeart,
            title: "AI concierge that knows your context",
            desc: '"What should I do today?" — answered with YOUR data',
          },
        ].map(({ icon: Icon, title, desc }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Icon className="h-4.5 w-4.5 h-[18px] w-[18px] text-primary" />
            </span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-3 pt-10">
        <Link
          href="/signup"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]"
        >
          Create your plan
        </Link>
        <Link
          href="/signin"
          className="flex h-12 w-full items-center justify-center rounded-xl border border-input bg-background text-base font-semibold transition-colors hover:bg-secondary active:scale-[0.98]"
        >
          I already have an account
        </Link>
        <p className="pt-2 text-center text-xs text-muted-foreground">
          Non-academic only — no admissions, no grades. Just your move.
        </p>
      </div>
    </main>
  );
}
