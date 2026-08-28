"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ListChecks,
  Map as MapIcon,
  MessageCircleHeart,
  CalendarRange,
  Settings,
  MapPin,
} from "lucide-react";
import { cn } from "@/shared/utils";
import { api } from "@/lib/client";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/plan", label: "Plan", icon: CalendarRange },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/places", label: "Places", icon: MapIcon },
  { href: "/concierge", label: "Chat", icon: MessageCircleHeart },
];

export function AppShell({
  children,
  destination,
  housingStatus,
}: {
  children: React.ReactNode;
  destination: string;
  housingStatus: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MapPin className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold tracking-tight">Student Life Journey</span>
          </Link>
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[active=true]:bg-secondary data-[active=true]:text-foreground"
            data-active={pathname === "/settings"}
          >
            <Settings className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="grid grid-cols-5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* context used by pages through props; also handy for a11y */}
      <span className="sr-only" data-destination={destination} data-housing={housingStatus}>
        Destination: {destination}
      </span>

      <button
        type="button"
        onClick={() => router.refresh()}
        className="hidden"
        aria-hidden
      />
    </div>
  );
}
