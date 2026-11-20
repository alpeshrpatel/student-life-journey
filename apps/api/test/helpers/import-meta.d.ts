// Minimal typing for Vite's `import.meta.glob`, which the Workers test runtime provides.
interface ImportMeta {
  glob<T = unknown>(
    pattern: string,
    options: { query: string; import: string; eager: true },
  ): Record<string, T>;
}
