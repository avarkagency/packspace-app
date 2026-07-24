# TODO — Feedback Round (23 Jul 2026)

## Features

- [~] **Widget system** — DONE: top-right 2-column bento grid; widgets span 1 or 2 cols; drag to rearrange + right-click menu (toggle size, move to column, remove, add widget); "Add Widget" also on the desktop-background menu. Balance widget has a 1-col form (hides legend list, shows a hover tooltip on the bar chart).
- [x] **"My NFT Collection" widget** — DONE: Cover Flow gallery of all owned NFTs (2D CSS perspective; cards turn/recede from centre). Navigate by buttons, drag-scrub, or clicking a side card. Active card shows the same readout the desktop shows for an NFT on hover. Works at 1 or 2 columns via the widget system.
- [ ] **Intro animation** — approved, build it
  - Stretch: do it with kinetic typography if it can be done well
- [ ] **Animated movement/motion of joy** — approved, add playful motion moments
- [ ] **Left vs right click-drag behaviour**
  - One drag button moves/pans the bento grid
  - The other drags the item as an icon until release (drop to reposition)
- [x] **Price change in green/red** — done: 24h percentage change tag inside the price pill on desktop icons and folder items

## Fixes / Polish

- [ ] **Transparency vs background image** — transparency level is probably right, but the background picture makes it hard to see through; improve contrast/legibility (e.g. backdrop blur, dim layer, or smarter background)

## Open Decisions

- [ ] **Wallet identity when address has no PFP** — treat the address as a *wallet* or as a *person*?
  - Leaning: treat address as a person, since packspace can send to an address/name/pfp interchangeably
  - Pick a default avatar style that matches whichever identity model we choose
- [x] **Chain indicator redundancy** — resolved: removed the Show/Hide Chains toggle and the on-icon EVM/SOL tag pills; the chain-family tag now lives in the hover tooltip's Network row
