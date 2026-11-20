import { useTranslation } from "react-i18next";

export type PlaceholderTitleKey = "home" | "notFound";

export function PlaceholderScreen({ titleKey }: { titleKey: PlaceholderTitleKey }) {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-ground p-6 text-ink">
      <h1 className="border-b-2 border-rule pb-3 text-screen font-extrabold">
        {t(`placeholder.${titleKey}`)}
      </h1>
    </main>
  );
}
