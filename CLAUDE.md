@AGENTS.md

# PackSpace — the visual wallet as a desktop (prototype)

One route: **`/`** → `src/app/page.tsx` → `<Desktop/>`. A wallet rendered as a **desktop OS**:
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
ortho canvas, not a scene. `raw-loader` is present for the same reason it is in the siblings: the
shaders (below).

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
src/components/ base/ (the Base* primitives) + desktop/ (all feature code)
src/const/      constants + layout maths (desktop-layout, desktop-config, pane, app-config)
src/data/       the fixture sets (assets, people, packs, apps, approvals, folders, colors, objects)
src/hooks/      the desk's own hooks (useDesktop*)
src/shaders/    <name>/{vertex,fragment}.glsl, imported as raw strings
src/lib/        rules + helpers (asset-ops, chain, wallets, widgets, inspect, market, sound,
                utils, drag-loop, receipt, object-art, coin-geometry, nft-geometry)
src/stores/     mutable module singletons (desk, coin, drag, chrome-keepout, clip-planes)
src/types/      objects.ts — the whole domain model
```

**Every component file carries its folder's name, and the folder's entry point IS the folder's name** —
the same rule as gacha's `home/Home.tsx`, `grid/Grid.tsx`, `castle/Castle.tsx`. So the pattern reads
`Parent`, `ParentChild`, `ParentChildItem`. Folders are singular. **No non-`.tsx` file lives under
`components/`**: geometry and art factories go to `lib/`, mutable singletons to `stores/`, pure
constants to `const/`.

All feature code is `src/components/desktop/`, one folder per cluster:

- **`Desktop.tsx`** — the entry point and the only stateful component of size. It owns every object's
  position, the drag/drop engine, the context menus and the split view; the surfaces, the marquee, the
  settlement and the transient cues are its hooks (below). Every other `Desktop*.tsx` at
  that level is a piece of its chrome: `DesktopBar`, `DesktopDock`, `DesktopIcon`, `DesktopFolder`,
  `DesktopPack`, `DesktopDetailCard` (an icon expanded in place), `DesktopMenu` (the context menu),
  `DesktopSearch` (the ⌘K palette), `DesktopHover` (the cursor readout), `DesktopToast`, and
  `DesktopPanes` (split view's furniture only — wallpapers, pane labels, divider).
- **`object/`** — everything that draws an object, in both worlds. `ObjectScene` is the R3F entry (the
  canvas + camera + clip rig) and mounts `ObjectMesh` and `ObjectNavIcon`; `ObjectMark`, `ObjectArt` and
  `ObjectAvatar` are its flat DOM twins for where the canvas doesn't reach; `ObjectVisual` is the
  icon/colour mapping every tint reads through.
  **`ObjectScene` deliberately keeps its suffix** rather than becoming `Object.tsx` — a component named
  `Object` shadows the JS global in its own module and in every file that imports it.
- **`window/`** — the modals, one file per action: `WindowSend`, `WindowTransfer`, `WindowHandoff`,
  `WindowSplit`, `WindowCombine`, `WindowMove`, `WindowUnpack`, `WindowPackBuilder`, `WindowFolder`,
  `WindowCard`, `WindowContact`, `WindowDelete`, `WindowReceipt`, `WindowReceipts`. `WindowShell` is the
  furniture they share — the backdrop, the corner dismiss and the glass card — and `WindowHeading` the
  title / pill / rule each opens with. Everything inside the card is still the window's own; the shell
  takes only what was byte-identical across all of them.
- **`panel/`** — the right-docked `PanelInspector` and `PanelApprovals`.
- **`widget/`** — `Widget` is the top-right bento itself; `WidgetBalance` and `WidgetNft` are its tiles.
- **`fx/`** — the shader effects, reusable across the desk: `FxConfetti`, `FxRainbowBorder`.

## Where the desk's state lives

`Desktop.tsx` is deliberately the one stateful component: every action on the desk touches several
slices of the same state (an object's balance, its position, the folder holding it, the windows about
it), so splitting it by feature would mean a context and a lot of prop-drilling for no gain. What HAS
been lifted out is everything that stands on its own:

- **`const/desktop-layout.ts`** — the footprints (`ICON_*`, `CARD_*`, `DOCK_*`, `LABEL_*`), the stock
  arrangement (`defaultPositions`) and the placement maths (`clampPos`, `clashes`, `isFree`,
  `nearestFreeSpot`, `nearestFreeGroupOffset`). Plain module functions with no React, so they are safe
  to call from a pointer handler. The components that draw an icon, a card, the dock and the pane labels
  READ their footprints from here rather than exporting them — the layout maths is the primary reader.
- **`stores/desk.ts`** — the module mirrors that maths needs: `detailCardIds` (whose footprint is a card,
  not an icon), `objectWallet` and `panesMirror`. Written by ONE layout effect in `Desktop.tsx` through
  `setDetailCards` / `setObjectWallets` / `setPanes`, so they land before paint and long before any
  pointer handler could consult them.
- **`hooks/useDesktopSurfaces`** — everything the desk can have OPEN: the modal stack, the panels, the
  palette, the receipts. Collected because of the sound — every surface blooms open and errors closed,
  a rule that only holds while there is no second way to set the state.
- **`hooks/useDesktopSettlement`** — what happens when a transfer settles: `consumeAssets` (shared) plus
  Send's and Handoff's own receipts.
- **`hooks/useDesktopMarquee`** — the sweep-select and the ids it holds.
- **`lib/drag-loop.ts`** — `dragLoop`, the window-listener pointer drag every hand-rolled gesture runs on
  (the pack and folder tiles, the folder window's own move and resize): a travel threshold so a press that
  never moved stays a click, deltas from the press point, both listeners torn down on release.
- **`hooks/useDesktopToast` / `useDesktopFlash` / `useDesktopPulse`** — the three transient cues. Each
  owns its own timer and clears it on unmount, so no caller has to remember to.
- **`const/desktop-config.ts`** (wallpapers, the stock bento, the split keep-out) and
  **`data/folders.ts`** (the folders the desk starts with) hold the seeds.

## Shaders

**GLSL lives in `src/shaders/<name>/{vertex,fragment}.glsl`, never inline in a component** — the same
layout as gacha. They are imported as raw strings through a `raw-loader` rule in `next.config.ts`
(`turbopack.rules`), typed by `src/shaders/glsl.d.ts`:

```ts
import FRAG from "@/shaders/rainbow-border/fragment.glsl"
import VERT from "@/shaders/rainbow-border/vertex.glsl"
```

Two of them today, both raw WebGL overlays rather than R3F materials: `rainbow-border` (the Inspector's
iridescent edge glow) and `confetti` (the settled-receipt celebration).

**A TS value a shader needs is prepended as a `#define`, not interpolated into the source.** `confetti`
does this with `COUNT`, which sizes its uniform arrays and bounds its fragment loop:

```ts
const FRAG = `#define COUNT ${COUNT}\n${FRAG_SRC}`
```

That keeps the `.glsl` file a real, editable shader (no `${}` holes) while the compiler still folds the
value as a constant. It is the same trick gacha's `CastleParticles` uses for its `MOTE_*` constants.

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
  `const/desktop-layout.ts`). A drop lands where it was released, then walks outward in rings to the
  nearest clear spot. Only objects on the **same wallet's desk** can clash. A carried multi-selection resolves
  as one shared offset, so a formation keeps its shape rather than exploding.
- **The chrome keep-out** (`stores/chrome-keepout.ts`). The top-right widget bento reports its live box;
  `clampPos` reads it so an icon can never park underneath the search bar or the bento and become
  unreachable. Mutable module state on purpose — the clamp is called from every drag frame and must not
  go through React.
- **The 3D layer** (`desktop/object/ObjectScene.tsx`) is deliberately thin. The DOM keeps layout,
  hit-testing and labels; the canvas only *draws* an object into the box each icon reserves, via
  `stores/coin.ts` (each card registers its screen box, the frame loop reads them back). One ortho
  camera, 1 unit = 1px.
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
- **A new component's name starts with its folder's**, and nothing but the folder's entry point is the
  bare folder name — a file in `window/` is `Window<Thing>`, in `widget/` `Widget<Thing>`. Don't add a
  non-`.tsx` file under `components/`; it belongs in `lib/`, `stores/` or `const/`.
- **`type`, never `interface`.** Components are named exports; there are no default exports outside
  `src/app/`. Export only what another file imports — a helper used solely inside its own module stays
  file-local.
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
