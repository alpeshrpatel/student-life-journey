// Temporary English titles; real strings arrive with i18n (S-R0-020).
const TITLES = {
  home: "Student Life Journey",
  notFound: "Page not found",
} as const;

export type PlaceholderTitleKey = keyof typeof TITLES;

export function PlaceholderScreen({ titleKey }: { titleKey: PlaceholderTitleKey }) {
  const title = TITLES[titleKey];
  return (
    <main className="min-h-screen bg-ground p-6 text-ink">
      <h1 className="border-b-2 border-rule pb-3 text-screen font-extrabold">{title}</h1>
    </main>
  );
}
