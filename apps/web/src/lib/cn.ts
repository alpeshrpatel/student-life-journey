import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Tide font sizes are custom `--text-*` tokens; tell tailwind-merge they are sizes, not colours.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "eyebrow",
            "meta",
            "small",
            "control",
            "body",
            "lead",
            "title",
            "figure",
            "screen",
            "hero",
            "hero-lg",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
