const STORY_ID = /\((S-R\d-\d{3}|no-story)\)$/;

export default {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        "story-id": ({ header }) => {
          const ok = typeof header === "string" && STORY_ID.test(header.trim());
          return [ok, "the subject must end with a story ID, for example (S-R0-001), or (no-story)"];
        },
      },
    },
  ],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "test", "docs", "chore", "ci", "build", "perf"],
    ],
    "scope-enum": [
      2,
      "always",
      ["api", "web", "domain", "contracts", "ai", "client", "mobile", "site", "repo"],
    ],
    "story-id": [2, "always"],
  },
};
