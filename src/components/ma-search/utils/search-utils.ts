export function readText(value: string | (() => string) | undefined, fallback: string): string {
  return typeof value === 'function' ? value() : (value ?? fallback)
}
