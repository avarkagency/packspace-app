@AGENTS.md

# PackSpace — the visual wallet as a desktop (prototype)

One route: **`/`** → `src/app/page.tsx` → `<DesktopWorkspace/>`. A wallet rendered as a **desktop OS**:
every holding, contact, pack and folder is an icon on a wallpaper, and everything you can do is done to
the object itself — drag it onto a contact to send it, drop it onto a matching portion to combine,
right-click it for its own menu. There are no lists and no forms you navigate to; windows are modals
that open where the gesture landed.

Sibling to **Aboyz** (`../aboyz`) and **Gacha Labs** (`../gachalabs`). Shares their stack, their
prettier/eslint config and the px design-scale system; the palette and the whole interaction model are
its own. Frontend prototype only — no backend, no chain, dummy data throughout.

**Dark is the only theme.** `:root` in `globals.css` holds the palette; there is no `.dark` class, no
`dark:` variant, no toggle, no URL switches.

## Stack

**Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 (CSS-first, `@theme inline` in
`globals.css` — no `tailwind.config`) · React Three Fiber 9 + three 0.184 · GSAP + @gsap/react ·
lucide-react · cuelume (synthesized Web Audio) · @outpacelabs/avatars.**

No drei, no postprocessing, no leva, no r3f-perf, and therefore **no `patches/` or `postinstall`** —
that's a deliberate divergence from the siblings, not an omission. The 3D layer here is one thin
ortho canvas, not a scene.

## Run

- **Node 22 required** (`.nvmrc` = 22.14.0; the shell default is Node 18 and Next 16 rejects it).
  `nvm use` then `npm run dev`.
- Validate with `npx tsc --noEmit` and `npx eslint "src/**/*.{ts,tsx}"`. Note `next.config.ts` sets
  `typescript.ignoreBuildErrors` — a Vercel build never fails on TS/lint, so run these yourself.
- `reactStrictMode` is **off**: the Handoff counterparty is driven by timers and strict mode's
  double-mount fires them twice.

## Layout

```
src/app/        route + globals.css
src/components/ base/ canvas/ desktop/ panels/ shell/ widgets/ windows/ workspace/
src/const/      pure constants + layout maths (app-config, pane)
src/data/       the fixture sets (assets, people, packs, apps, approvals, colors, objects)
src/hooks/      useDesktopDrag, usePrefersReducedMotion
src/lib/        rules + helpers (asset-ops, chain, wallets, widgets, inspect, market, sound, utils)
src/stores/     mutable module singletons (coin, drag, chrome-keepout)
src/types/      objects.ts — the whole domain model
```

- **`workspace/DesktopWorkspace.tsx`** is the entry point and the only stateful component of size. It
  owns every object's position, the window stack, the menus, selection, and the split view.
  `workspace/SplitPanes.tsx` is split view's furniture only (wallpapers, pane labels, divider).
- **`desktop/`** — what sits ON the desk: `DesktopIcon`, `DesktopFolder`, `DesktopPack`,
  `DesktopDetailCard` (an icon expanded in place), plus the chrome `DesktopBar`, `DesktopDock` and the
  context menu `DesktopMenu`.
- **`windows/`** — the modals, one file per action (`SendWindow`, `TransferWindow`, `HandoffWindow`,
  `SplitWindow`, `CombineWindow`, `MoveWindow`, `UnpackWindow`, `PackBuilderWindow`, `FolderWindow`,
  `CardWindow`, `ContactWindow`, `DeleteWindow`, `ReceiptWindow`, `ReceiptsListWindow`), all inside the
  shared frame `Window.tsx`.
- **`canvas/`** — the R3F layer (below). **`panels/`** — the right-docked Inspector and Approval Radar.
  **`shell/`** — floating chrome that isn't the desk: hover readout, toast, search palette, avatars.
  **`widgets/`** — the top-right bento. **`base/`** — the `Base*` primitives.

## Key systems

- **Positions are PANE-RELATIVE, not viewport** (`const/pane.ts`). In a single-wallet view the pane IS
  the viewport, so a position is its screen position. In split view each wallet gets half and the same
  stored number reads as "70px in from *my* pane's left edge" — which is what lets an arrangement
  survive the switch between views instead of being re-laid-out every time the divider moves. Because
  every position is clamped to its own pane, a resting object can never overflow into the other half,
  so the panes need no clipping and the single full-screen 3D canvas stays correct for free. The only
  thing that ever crosses the divider is an object in hand, which should.
- **Two wallets, one asymmetry** (`lib/wallets.ts`). Openfort is a Project G smart account and
  multichain, so it holds anything; MetaMask is an EOA on EVM only. A Solana token or a Bitcoin address
  simply cannot live there, and dragging one across the divider is **blocked, not bridged** (bridging is
  Phase 2) — `moveBlockMessage` is the single place that rule lives. An absent `wallet` on an object
  reads as Openfort, so the stock fixtures need no migration.
- **Placement** (`clampPos` / `isFree` / `nearestFreeSpot` / `nearestFreeGroupOffset` in
  `DesktopWorkspace`). A drop lands where it was released, then walks outward in rings to the nearest
  clear spot. Only objects on the **same wallet's desk** can clash. A carried multi-selection resolves
  as one shared offset, so a formation keeps its shape rather than exploding.
- **The chrome keep-out** (`stores/chrome-keepout.ts`). The top-right widget bento reports its live box;
  `clampPos` reads it so an icon can never park underneath the search bar or the bento and become
  unreachable. Mutable module state on purpose — the clamp is called from every drag frame and must not
  go through React.
- **The 3D layer** (`canvas/ObjectScene.tsx`) is deliberately thin. The DOM keeps layout, hit-testing
  and labels; the canvas only *draws* an object into the box each icon reserves, via `stores/coin.ts`
  (each card registers its screen box, the frame loop reads them back). One ortho camera, 1 unit = 1px.
  The canvas is `pointer-events-none`, above the desktop so a dragged object flies over the wallet icons
  intact, and below the modals at z-200+. Loaded through `dynamic(..., { ssr: false })` — WebGL can't
  render on the server and the coin faces are drawn to a 2D canvas at material-build time.
- **Drag** (`hooks/useDesktopDrag.ts` + `stores/drag.ts`). Pixel positions are moved **imperatively** in
  the pointer handlers, never through the store; the store carries only what's in hand and which drop
  zone the pointer is over. A group carry is a drag as far as every consumer is concerned.
- **Drop keys are namespaced strings** (`lib/asset-ops.ts`): `asset:` `wallet:` `folder:` `nav:`. Every
  icon is a potential target, so the prefix is what tells the handlers apart.
- **Sound** (`lib/sound.ts`, over `cuelume` — synthesized, no files). Three roles: `bloom` (a surface
  opens), `error` (a surface closes), `press` (every other click, wired globally by `installPressCues`
  off a selector; plain divs opt in with `data-cue-press`). The guards matter: a press within `GUARD_MS`
  of a bloom/error is the same gesture and is swallowed, and a window closing within `SETTLE_MS` of a
  settle sparkle stays quiet so success never sounds like a cancel. Mute persists to localStorage.
- **Reduced motion** is handled in CSS globally, but the frame loop no media query can reach asks
  directly via `hooks/usePrefersReducedMotion` (matchMedia as an external store).

## Data

All fixtures, no backend. `data/assets.ts` (the desk's holdings, the dust that fills the folders, the
EOA set, the Handoff counterparty's offers, and the invented `dayChange` 24h moves), `data/people.ts`
(contacts + your own identity), `data/packs.ts`, `data/apps.ts` (dock + launcher), `data/approvals.ts`
(the Approval Radar's standing approvals), `data/colors.ts` (the token colour signatures every fixture
reads), `data/objects.ts` (the flat id index).

**`PACKS`, `APPS`, `VAULTS`, `CAMPAIGNS` and `APPROVALS` currently have no consumer outside
`data/objects.ts`.** They are scaffolding for the unbuilt nav destinations (Contacts, Activity, dApps,
Approvals) — deliberate, not dead weight to prune.

## Gotchas / conventions

- **Imports are `@/`-absolute across folders**, `./` only within one. Matches both siblings; the
  `importOrder` groups in `.prettierrc.json` key off `^@/components/`, `^@/lib/`, `^@/data/`, so a
  `../` import also lands in the wrong prettier group.
- **`type`, never `interface`.** Components are named exports; there are no default exports outside
  `src/app/`.
- **React Compiler lint is strict**: no mutating hook returns/props, no `setState` synchronously in
  effects, no reading `ref.current` in render. Shared mutable state lives in `src/stores/*`.
- **The `* { border-color }` rule in `globals.css` must stay inside `@layer base`.** Unlayered it beats
  every layer, including `utilities`, and silently kills every `border-{color}` utility in the app —
  `border-accent`, `border-danger`, the lot resolve to `--border` and nothing looks broken enough to
  notice.
- **Never hand-write `-webkit-backdrop-filter`.** Lightning CSS treats the pair as one logical property
  and keeps only the last form, which deletes the standard `backdrop-filter` and kills the blur in
  Chrome. Declare the standard property alone and let the compiler prefix it.
- **`font-sans` has to be applied as a utility on `<body>`** (see `layout.tsx`), not as a
  `font-family: var(--font-sans)` rule. `@theme inline` inlines its values into utilities and never
  emits them as real custom properties, so a raw `var(--font-sans)` silently falls back to system sans.
- **`cn()` is `tailwind-merge` extended with our px font scale** (`lib/utils.ts`). Stock tailwind-merge
  reads `text-14` as a *colour* and drops it the moment a real colour follows. Only affects strings that
  pass through `cn()`.
- **Design scale**: spacing and font sizes are raw pixels (`p-16` = 16px, `text-14` = 14px); line-height
  is separate (`leading-120` = 1.2). Breakpoints are **desktop-first max-width** variants
  (`sl xxxl xxl xl l m s xs xxs t`) — Tailwind's default min-width breakpoints are cleared.
