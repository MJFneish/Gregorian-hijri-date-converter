/** System fonts on purpose: they ship proper Arabic shaping (Noto Naskh / SF Arabic) for free,
 * which a bundled Latin display face wouldn't. Body text stays >= 16 for readability. */
export const typography = {
  displayLarge: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.4 },
  displayMedium: { fontSize: 28, fontWeight: '700' as const },
  title: { fontSize: 20, fontWeight: '700' as const },
  subtitle: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.6 },
};
