// Token colour signatures (data-driven, per doctrine — the chrome stays monochrome; the objects carry
// the colour). Shared by every asset fixture, which is why it sits in its own file.

export const C = {
  usdc: "#2775ca",
  eth: "#627eeb",
  usdt: "#1ba27a",
  sol: "#14f195",
  bnb: "#f1b90c",
  // the polaroids take their colour from their own artwork; these only feed the chrome that still reads
  // objectTint() — the drag label and the coins' fallback faces
  bayc: "#f0a03c",
  azuki: "#e5474b",
  doodles: "#5db4f0",
  stack: "#f472b6"
}
