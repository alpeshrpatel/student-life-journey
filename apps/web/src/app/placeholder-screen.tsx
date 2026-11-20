// Temporary English titles; real strings arrive with i18n (S-R0-020).
const TITLES = {
  home: "Student Life Journey",
  notFound: "Page not found",
} as const;

export type PlaceholderTitleKey = keyof typeof TITLES;

export function PlaceholderScreen({ titleKey }: { titleKey: PlaceholderTitleKey }) {
  const title = TITLES[titleKey];
  return (
    <main>
      <h1>{title}</h1>
    </main>
  );
}
