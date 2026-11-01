type Rgb = readonly [number, number, number]

function parseHex(value: string): Rgb | undefined {
  const input = value.trim()
  if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(input)) return
  const hex = input.slice(1)
  const expanded = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex
  const channel = (index: number) => Number.parseInt(expanded.slice(index, index + 2), 16)
  return [channel(0), channel(2), channel(4)]
}

function luminance(rgb: Rgb) {
  const channels = rgb.map(channel => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrast(first: Rgb, second: Rgb) {
  const a = luminance(first)
  const b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function mix(rgb: Rgb, target: Rgb, amount: number): Rgb {
  const channel = (index: number) => Math.round(rgb[index] + (target[index] - rgb[index]) * amount)
  return [channel(0), channel(1), channel(2)]
}

function toHex(rgb: Rgb) {
  return `#${rgb
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`
}

/** Foreground for an opaque hex swatch, independent of the surrounding theme. */
export function getColorForeground(value: string) {
  const rgb = parseHex(value)
  if (!rgb) return
  return contrast(rgb, [255, 255, 255]) >= contrast(rgb, [0, 0, 0]) ? '#FFFFFF' : '#000000'
}

/** Adapt the displayed tone without changing the user's saved hex selection. */
export function resolvePrimaryColors(value: string, dark: boolean) {
  const rgb = parseHex(value)
  if (!rgb) return
  const target: Rgb = dark ? [255, 255, 255] : [0, 0, 0]
  const surface: Rgb = dark ? [38, 38, 38] : [250, 250, 250]
  // Leave contrast headroom for primary text on tinted badges and selected rows.
  const minimum = dark ? 6 : 5.5
  let primary = rgb
  for (let step = 0; step <= 100; step++) {
    primary = mix(rgb, target, step / 100)
    if (contrast(primary, surface) >= minimum) break
  }
  return {
    primary: toHex(primary),
    foreground: dark ? '#171717' : '#FFFFFF',
    hover: toHex(mix(primary, target, 0.1)),
  }
}
