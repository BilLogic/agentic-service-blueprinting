/**
 * The colour maths, as a leaf module both the token model and the app can
 * import.
 *
 * It lived inside `tokenModel.ts`, which is test-time only — it reads the
 * stylesheet tree off disk — so nothing that runs in a browser could reach it.
 * The brand-accent reader has to: turning a deployment's accent into the hue
 * dial the token steps derive from is an sRGB→OKLCH conversion, and the one
 * thing worse than no reader is a second implementation of this arithmetic
 * drifting from the one every colour guard measures against.
 *
 * So the conversions live here and `tokenModel.ts` re-exports them unchanged.
 * Nothing about the decision that one token model is the single style seam
 * changes: the model is still the single seam a rule asks its questions of;
 * this is the arithmetic underneath it, with no opinion about stylesheets,
 * themes or the cascade.
 */

export type Rgb = [number, number, number]

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const sat = s / 100
  const light = l / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = light - c / 2
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  return [r + m, g + m, b + m]
}

/** OKLCH -> linear sRGB (Bjorn Ottosson's matrices). */
export function oklchToLinearSrgb(l: number, c: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  ]
}

export const inSrgbGamut = (rgb: Rgb) =>
  rgb.every((v) => v >= -1e-6 && v <= 1 + 1e-6)

/** Gamma-encoded sRGB, so these values meet the `Rgb` the solver expects. */
export function oklch(l: number, c: number, hDeg: number): Rgb {
  return oklchToLinearSrgb(l, c, hDeg).map((v) => {
    const clamped = Math.min(1, Math.max(0, v))
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * clamped ** (1 / 2.4) - 0.055
  }) as Rgb
}

/** Gamma-encoded sRGB -> OKLCH triple. */
export function oklchFromSrgb([r, g, b]: Rgb): [number, number, number] {
  const lin = (v: number) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const l_ = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m_ = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s_ = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const B2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  return [
    L,
    Math.hypot(A, B2),
    ((Math.atan2(B2, A) * 180) / Math.PI + 360) % 360,
  ]
}

/** OKLCH hue in degrees for a gamma-encoded sRGB colour. */
export function oklchHue(rgb: Rgb): number {
  return oklchFromSrgb(rgb)[2]
}

/** Largest in-gamut chroma at this lightness and hue, to 4dp. */
export function chromaCeiling(l: number, hDeg: number): number {
  let lo = 0
  let hi = 0.5
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (inSrgbGamut(oklchToLinearSrgb(l, mid, hDeg))) lo = mid
    else hi = mid
  }
  return lo
}

export function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (v: number) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  )
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2))
}

/**
 * The ink `[data-blueprint-fill]` derives for a fill, mirrored in JS.
 *
 * The CSS is `oklch(from <fill> clamp(0.12, calc((0.62 - l) * 100), 0.99)
 * calc(c * 0.08) h)`. The clamp is a step function in practice: any fill below
 * L 0.62 gets L 0.99 ink, anything above gets 0.12, because the multiplier is
 * 100. Chroma drops to 8% so the ink is tinted rather than stark, and the hue
 * rides along.
 *
 * Mirrored rather than asserted against one hard-coded ink, because a
 * hard-coded ink is exactly what this pairing replaced.
 */
export function derivedFillInk(fill: Rgb): Rgb {
  const [l, c, h] = oklchFromSrgb(fill)
  const inkL = Math.min(0.99, Math.max(0.12, (0.62 - l) * 100))
  return oklch(inkL, c * 0.08, h)
}

/**
 * A CSS hex colour (`#RGB` or `#RRGGBB`, case-insensitive) as gamma-encoded
 * sRGB.
 *
 * Strict rather than forgiving: a deployment's accent is authored code that a
 * type-check and a test both see before a browser does, so a value this cannot
 * read is a bug worth hearing about at the point it is written rather than a
 * silently ignored field — which is the failure `brandAccent.ts` exists to
 * end.
 */
export function hexToRgb(hex: string): Rgb {
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!match) throw new Error(`not a hex colour: ${hex}`)
  const digits =
    match[1].length === 3
      ? [...match[1]].map((digit) => digit + digit).join('')
      : match[1]
  return [0, 2, 4].map((at) =>
    parseInt(digits.slice(at, at + 2), 16) / 255,
  ) as Rgb
}

/**
 * `over` at `alpha` painted on `under`, the way a browser paints it.
 *
 * Simple alpha compositing in the gamma-encoded space, which is what a
 * translucent CSS colour does over an opaque one — not the linear-light blend
 * a physical mix would be. The distinction matters here because several tokens
 * in the system ARE translucent (`--muted`, `--wash-*`), and the only honest
 * way to measure ink against one of them is to paint it first.
 */
export function composite(over: Rgb, alpha: number, under: Rgb): Rgb {
  return over.map((v, at) => v * alpha + under[at] * (1 - alpha)) as Rgb
}

/** OKLCH -> gamma-encoded sRGB, chroma-reduced to the sRGB gamut first. */
export function oklchInGamut(l: number, c: number, hDeg: number): Rgb {
  return oklch(l, Math.min(c, chromaCeiling(l, hDeg)), hDeg)
}
