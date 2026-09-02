# PackSpace — prototype

A design-mode prototype of **PackSpace**, the alternative visual wallet for the Project G ecosystem
(spec: `ProjectG_v2_0_AvarkUXUISpec_Part3_PackSpace`). Sibling to **Aboyz** and **Gacha Labs**; shares
their stack and px design-scale system, with its own identity.

**The wallet is a desktop.** Every holding, contact, pack and folder is an icon on a wallpaper, and
everything you can do is done to the object itself — drag it onto a contact to send it, drop it onto a
matching portion to combine, right-click it for its own menu. There are no lists you navigate to and no
forms you fill in first; windows are modals that open where the gesture landed.

Frontend only — no backend, no chain, dummy data throughout.

## The desk

- **Floating chrome over the wallpaper** — greeting and search up top, a widget bento pinned top-right,
  the app dock along the bottom. Between them, every object sits wherever it was last put. Holdings
  start in columns on the left, contacts in rows anchored bottom-right; a drag anywhere just places the
  icon where it's released, and the arrangement is the user's from then on.
- **Two wallets, one desk each.** Openfort (a Project G smart account, multichain) and MetaMask (an EOA,
  EVM only). A segmented control switches between them, or shows both side by side in **split view**
  with a draggable divider and a wallpaper each.
- **Objects, not rows.** Icons for the ordinary case; a holding can be expanded into a **detail card**
  in place. Right-click an object for its own menu (Split a token, Rename / Edit / Delete a contact,
  Inspect with AI); right-click the desk for housekeeping — New Contact, Change Wallpaper, Clean Up,
  Clean Up By, Add Widget.
- **Folders** hold the long tail: token dust in Other Tokens, one-of-one dust in Other NFTs. Pull
  something out and set it on the desk and it whispers.
- **Multi-select** — sweep a marquee across the desk and drag the whole set as one formation. The
  handful keeps its shape on landing rather than exploding.
- **Hover readout** — a panel that trails the cursor carrying what the icon doesn't say: name, type,
  network and the raw address.
- **⌘K search palette** — a Raycast-style box reaching across tokens, NFTs, contacts and packs at once.
  A result flies straight into the AI Inspector.

## The actions

| | |
|---|---|
| **Send** | A one-way give, no recipient confirmation. Drop a holding on a contact; the transfer modal asks Send or Trade. |
| **Trade** (Handoff) | The confirmed two-sided exchange: lock → counterparty locks → locked review → confirm exact terms → all-or-nothing launch → receipt. |
| **Split** | Divide a fungible holding into two portions. A one-of-one is refused. Both halves flash the split's amber briefly so it's clear which icons it produced. |
| **Combine** | Split's inverse — drop a portion onto another holding of the same token to pour them back together. Only valid targets carry a drop key, so a drop can never land somewhere it won't resolve. |
| **Move** | An object crossing between your own two wallets. Blocked, never bridged, when the target can't hold it. |
| **Pack Builder / Unpack** | Bundle holdings into a pack object and take them back out again. |

> **Handoff is "Trade" to the user.** The rename covers what's read — the zone, the modal title, the
> receipt's action — while the internals stay `handoff`: the drop key, `WindowHandoff`, and the dApp of
> that name in the fixtures (a separate product). The spec calls the machine Handoff (§3.5.2), so the two
> names coexist deliberately rather than by drift.

Plus two safety surfaces: the **AI Object Inspector** (a bento takeover explaining any object in plain
English, with its facts, a price card and contextual actions) and the **Approval Radar** (every standing
token approval as a row — who can spend, which token, how much, on which network; revoking removes the
linked scam token from the desk too).

## The split view

**Object positions are stored pane-relative, not in viewport coordinates.** In a single-wallet view the
pane *is* the viewport, so a stored position is its screen position and nothing about the existing desk
changes. In split view each wallet gets half, and the same number now reads as "70px in from *my* pane's
left edge" — which is what lets an arrangement survive the switch between views instead of being
re-laid-out every time the divider moves.

Because every position is clamped to its own pane, a resting object can never overflow into the other
half. The panes therefore need no clipping, and the 3D coins — drawn by one full-screen canvas that
knows nothing about panes — stay correct for free. The only thing that ever crosses the divider is an
object in hand, which should.

The wallets are **asymmetric**, and that drives most of the rules: Openfort holds anything; MetaMask is
EVM-only, so a Solana token or a Bitcoin address simply cannot live there. Dragging one across is
blocked with a reason, not bridged — bridging is Phase 2. `lib/wallets.ts` is the single place that rule
lives.

## The object layer

The DOM stays the source of truth. A single full-viewport `<Canvas>` overlays it and draws an object into
the box each icon reserves — the DOM keeps layout, hit-testing and the labels, so the pointer/drop
machinery is untouched and there are no DOM overlays to reproject per frame. The canvas is
`pointer-events-none`, above the desktop (so a dragged object flies over the wallet icons intact) and
below the modals at z-200+.

**Shapes.** How an object *behaves* — where it sits, how it turns, lifts, flies home, clips and fades —
is identical whatever it looks like, so `ObjectMesh` owns all of that and the shape only decides which
meshes hang off the size group at the end. Built: **coin** (tokens, stablecoins, stacks, packs) and
**nft** (a polaroid — rounded white card, slight depth, the art inset behind a fine white border).

**Artwork** (`lib/object-art.ts`) is keyed by symbol and loaded once per symbol, shared across every
object holding it — split portions must not each decode their own copy. A symbol with no entry keeps the
face the coin draws for itself, so the fallback is a live path, not dead code.

- **A coin's rim takes its colour from the art**, sampled from the image's top-left 2×2 (a token mark
  sits on a flat field, so that corner *is* the field). Guessing a tint instead leaves the coin reading
  as a face stuck on a differently-coloured blank.
- **Every flat face is unlit** (`MeshBasicMaterial`, `toneMapped: false`) — coin faces and the polaroid's
  picture alike. Only the rim is metal.

  This is the ortho camera's doing, and it's worth understanding before "fixing" it. Under an
  orthographic projection every point on a flat face-on surface shares one view vector, so a metal face
  reflects a *single constant* of the environment across its whole area — sample it and every pixel comes
  back byte-identical. That isn't a reflection, it's a uniform wash sitting on the artwork, which is why
  faces read pale against their own source images and why turning one on hover looked right: the
  reflection vector finally moved. Unlit costs the face nothing it was getting, and `toneMapped: false`
  takes it around ACES too, so art lands at exactly its authored colour — USDC measures `#2775ca` on
  screen against `#2775ca` in the file. The rim is curved, so it still catches the environment properly
  and carries the coin. Raising the light intensity or lowering metalness only moves this wash around.

- **Orthographic camera, 1 world unit = 1 px** — a coin's position is just its icon's client rect, and
  every coin renders identically (a perspective camera would skew the ones at the edges).
- **`src/stores/coin.ts`** — icon rects, hover, cursor, focus. Outside React, like `stores/drag.ts`: the
  frame loop reads it every tick and must never cause a render.
- **Rects are measured every frame, from inside the render loop.** A dirty flag deferring the read to the
  frame *after* a scroll/resize isn't safe — those events aren't guaranteed to land before that frame's
  rAF, so the labels moved and the coins arrived late, reading as the coin sliding around on its own
  icon. A dozen batched rect reads cost one layout flush; far cheaper than that lag looked.
- **Clipping** — resting objects clip via `THREE.Plane`s; one in hand swaps to a pushed-out set so it can
  fly over the chrome, and keeps reading it the whole way home or it'd be sliced off on the way back.
  Each object owns its plane array, so swapping can never recompile a shader.
- **Release flies home** rather than snapping: the object eases from wherever it was dropped back to its
  slot (~250ms), then hands its position back to the measured rect.
- **A dragged object sits at `z=500`, and every resting one holds still.** Ortho, so z only orders it in
  front — but it has to clear the desk by more than an object's radius, because a spinning one sweeps its
  whole radius through z as it passes edge-on. At a small offset the two intersect and slice through each
  other; stopping the resting ones spinning removes the other half of that.
- **Icons must not move on hover.** A CSS transform would shift the slot without the canvas knowing, and
  the coin would drift off it. The coin's own spin/scale is the hover feedback.
- **Watch three's UVs whenever art has to land square.** Two of the geometries here get them wrong for
  our purposes, in different ways:
  - `CylinderGeometry` derives cap UVs from (cosθ, sinθ) while its ring vertices run (sinθ, cosθ) — U
    maps to local Z and V to local X, an axis swap. That's a *reflection*, so cap artwork lands rotated
    **and** mirrored, and no texture rotation can undo a reflection. Hence the coin is three meshes: an
    open-ended rim plus `CircleGeometry` faces, which map U←x, V←y straight.
  - `ShapeGeometry` writes raw vertex coordinates into its UVs rather than normalising them, so a texture
    maps 1:1 against world units. On a shape centred at the origin that lands the whole image in the
    +x/+y quadrant and clamps the edge pixel across the other three. `fitUv()` remaps it to the shape's
    bounds.
- Only materials differ per coin, tinted from `objectTint()`. Faces are drawn to a 2D canvas in
  greyscale — `map` multiplies the colour, so one recipe tints itself for every coin. Reflections come
  from three's built-in `RoomEnvironment` (no asset, no CDN fetch).

## The look

A clean desktop in dark: neutral charcoal field, frosted-glass chrome, one restrained blue accent, Inter
throughout. The objects carry all the colour; the chrome stays quiet. Each action keeps its own signal
(`--action-send` green, `--action-trade` blue, `--action-split` amber) rather than borrowing the accent.
Victor Mono stays available via `font-mono` for raw addresses and hashes.

The glass is two utilities in `globals.css`: **`panel`** (a whisper of white, heavy blur, a hairline
border doing the lifting a drop shadow can't) and **`glass`**, whose border isn't a border — it's a
gradient ring on an overlay layer masked down to a hairline, so the edge catches light top-left and
bottom-right and melts away in between rather than reading as a solid white stroke.

Traps in this stack, every one of which fails **silently**. Check the computed style; don't trust the
screenshot:

- **Keep `* { border-color }` inside `@layer base`.** Unlayered, it beats every layer — `utilities`
  included — and kills every `border-{color}` utility in the app: `border-accent`, `border-danger`, the
  lot all resolve to `--border`, and nothing looks broken enough to notice. It's a Tailwind v3 idiom,
  where preflight was itself layered and an unlayered default lost to utilities.
- **Never hand-write `-webkit-backdrop-filter`.** Lightning CSS treats the pair as one logical property
  and keeps only the *last* form, which silently deleted the standard `backdrop-filter` and killed the
  blur in Chrome. Declare the standard property alone and let the compiler add the prefixes.
- **Lightning CSS drops a whole `@utility` if one declaration won't parse** — no warning, no rule, just
  absent from the output while its neighbours compile. If a utility silently doesn't exist, grep the
  served CSS for it before suspecting anything else.
- **`font-sans` has to be the utility on `<body>`, not `font-family: var(--font-sans)` in CSS.** The
  theme block is `@theme inline`, which inlines its values into utilities and never emits them as custom
  properties — so `var(--font-sans)` resolves to nothing and the declaration falls back to system sans.
- **`tailwind-merge` reads `text-14` as a colour.** Its stock config only knows t-shirt sizes in the
  font-size group, so `cn("text-14", "text-foreground")` treated them as a conflict and dropped the size.
  `cn` extends the merge with our pixel scale (`src/lib/utils.ts`). Only `cn` call sites are affected —
  plain `className` strings never pass through the merge, which made it look font-specific.
- **`next/image` is `unoptimized` for the network badges and avatars.** At 28px Next requests a `w=32`
  variant, and its dev converter drops the connection on three of the four marks — only whichever it has
  already cached survives, which looks exactly like a broken mapping. They're 200px local files shown at
  28px; there is nothing to optimise. Larger widths convert fine, so this is specific to the small
  variant.

**Avatars are the address** (`@outpacelabs/avatars`): the gradient is seeded by the wallet address, so a
contact's avatar can't collide with another's and changes if the address does. `WALLET` in
`data/people.ts` holds your address in full for the same reason — it seeds the avatar as well as being
displayed.

**Sound** (`lib/sound.ts`, over `cuelume` — synthesized Web Audio, no files) has three roles: `bloom` (a
surface opens), `error` (a surface closes) and `press` (every other click, wired globally off a selector;
plain divs opt in with `data-cue-press`). Two guards matter: a press within 40ms of a bloom/error is the
same gesture and is swallowed, and a window closing within 200ms of a settle sparkle stays quiet, so
success never sounds like a cancel. Mute persists across reloads.

> "Desktop feel, dApp reality" (spec §3.1 / DEV2: never fake an OS) — this is a workspace's look, not an
> OS's. The 24h moves in `data/assets.ts` are invented: the design shows change figures, and nothing
> here models price history.

## Run

- **Node 22** (`.nvmrc` = 22.14.0). `nvm use`, then `npm install` and `npm run dev` →
  http://localhost:3000. (Aboyz and Gacha Labs also default to 3000 — run one at a time, or
  `npm run dev -- -p 3007`.)
- Validate: `npx tsc --noEmit` and `npx eslint "src/**/*.{ts,tsx}"`. `next.config.ts` sets
  `typescript.ignoreBuildErrors`, so a Vercel build never fails on TS/lint — run these yourself.
- `reactStrictMode` is **off**: the Handoff counterparty is driven by timers, and strict mode's
  double-mount fires them twice.
- Stack: Next 16 (App Router, Turbopack) · React 19 · Tailwind v4 (`@theme inline` in `globals.css`, no
  `tailwind.config`) · React Three Fiber + three · GSAP · lucide-react · cuelume.
- The React Compiler lint is on and strict: no mutating what a hook returned, no `setState` in an effect
  body, no reading `ref.current` in render. That's why shared mutable state lives in `src/stores/` and
  the env map is `attach`ed rather than assigned onto the scene.

## How to drive it

1. **Hover an object** → it spins, and the readout follows the cursor. **Drag one** → it lifts and flies
   at the pointer; only the targets that can take it stay lit.
2. **Drop it on a contact** → the transfer modal asks Send or Trade.
   - **Send:** amount → Transaction Interpreter + Safety Engine → sign. High-value = type-to-confirm.
     Try **ghost.eth** (blocked — compromised) or **Dez** (retired).
   - **Trade:** lock your side → counterparty locks → locked review → confirm exact terms →
     all-or-nothing launch → receipt. Edit a locked slot to watch the locks break.
3. **Right-click a token → Split** to divide it. Try a one-of-one — it's refused. **Drag one portion
   onto the other** to recombine; the total is identical before and after.
4. **Switch to split view** and drag something across the divider. A Solana token or a Bitcoin address
   headed for MetaMask is blocked with a reason.
5. **⌘K** to search the whole desk, or right-click → **Inspect with AI** for the bento takeover.
6. Right-click the desk for **Clean Up By**, **Change Wallpaper** and **Add Widget**.

## File map

- `src/types/objects.ts` — the object system. `src/data/*` — every fixture set. `src/lib/utils.ts` —
  formatters + `cn`.
- `src/lib/asset-ops.ts` — split / same-token / combine rules + the namespaced drop-key helpers
  (`asset:` `wallet:` `folder:` `nav:`).
- `src/lib/wallets.ts` — the two wallets and the EVM-only rule. `src/lib/chain.ts` — the multichain (not
  cross-chain) compatibility model. `src/lib/inspect.ts` — the Inspector's local explanations and facts.
- `src/stores/{desk,drag,coin,chrome-keepout,clip-planes}.ts` — the out-of-React singletons: the layout
  maths' mirrors of React state (which objects wear a card, which wallet holds what, where each pane
  is), drag state, coin screen geometry, the top-right chrome's keep-out box, the shared clip planes.
- `src/const/pane.ts` — the pane maths behind split view. `src/const/desktop-layout.ts` — the desk's
  footprints, its stock arrangement and the placement/collision maths. `src/const/desktop-config.ts` —
  wallpapers, the stock widget bento, the split keep-out. `src/const/app-config.ts` — session fixtures.
- `src/shaders/<name>/{vertex,fragment}.glsl` — the GLSL, imported as raw strings via the `raw-loader`
  rule in `next.config.ts`. Never inline in a component; a TS value a shader needs is prepended as a
  `#define` rather than interpolated into the source.
- `src/hooks/useDesktop*.ts` — the desk's own hooks: `Drag`, `Marquee`, `Surfaces` (everything that can
  be open, and the sound it makes), `Settlement` (what a Send or Trade actually does), and the three
  transient cues `Toast`, `Flash`, `Pulse`.
- `src/lib/{coin,nft}-geometry.ts` — geometry, textures and materials per shape. `src/lib/object-art.ts`
  — the artwork registry + base-colour sampling.

All feature components live under `src/components/desktop/`, and **every file carries its folder's
name** (`Parent`, `ParentChild`, `ParentChildItem`), with the folder's entry point named for the folder
itself:

- `Desktop.tsx` — the whole desk. Beside it, its chrome: `DesktopBar`, `DesktopDock`, `DesktopIcon`,
  `DesktopFolder`, `DesktopPack`, `DesktopDetailCard`, `DesktopMenu`, `DesktopSearch`, `DesktopHover`,
  `DesktopToast`, `DesktopPanes` (split view's furniture).
- `object/` — `ObjectScene` (canvas + camera + clip rig), `ObjectMesh` (one object: all the shared
  behaviour, plus a body per shape), `ObjectNavIcon`, and the flat DOM twins `ObjectMark`, `ObjectArt`,
  `ObjectAvatar`, plus `ObjectVisual` (icon / colour mapping — `objectTint()` is the single funnel every
  tint reads through). `ObjectScene` keeps its suffix on purpose: a component named `Object` would
  shadow the JS global.
- `window/` — one file per action, `WindowSend` through `WindowUnpack`. No shared frame; each paints its
  own chrome.
- `panel/` — `PanelInspector`, `PanelApprovals`. `widget/` — `Widget` (the bento) + `WidgetBalance`,
  `WidgetNft`. `fx/` — `FxConfetti`, `FxRainbowBorder`.
- `src/components/base/` — the `Base*` primitives, the only components outside `desktop/`.
- `public/images/{tokens,nfts,chains,contacts,nav-icons}/` — artwork and network marks.

## Spec fidelity notes

- **Handoff** implements the §3.5.2 Lock-then-Confirm machine: two-confirmation invariant (both sides,
  every mode), locked-review countdown, break-locks-on-edit, all-or-nothing launch, free cancel
  pre-launch, self-writing summary + live header, receipt on settle.
- **Send** has no recipient confirmation (it's a give); Handoff is the confirmed path.
- **Split** is asset division — a UX convenience preparing portions for a separate Send or Trade — and
  **Combine** is its inverse. Nothing settles and no chain semantics are implied; a split-then-combine
  round trip leaves the holding and the total untouched. **PLANNED — phase placement still open**, so
  both flows are deliberately minimal.
- **A split doesn't move anything.** The original survives — same id, same place, lighter — and the clone
  lands beside it. Both wear the split's amber flash briefly so it's clear which two icons the split
  produced; it clears itself after ~2s. An announcement, not a state.
- **Combine matches on token + chain**, not on split lineage. Splitting is the only way a wallet ends up
  holding one token twice, so in practice those are always portions — matching the token just means it
  keeps working if they ever arrive by another route.
- **Safety cues**: Transaction Interpreter, Safety Engine states (safe / caution / blocked), RETIRED +
  COMPROMISED destinations, unverified tokens, unlimited approvals, high-value type-to-confirm.
- **Multichain, not cross-chain.** Assets stay on their native chain; nothing bridges. A Project G wallet
  accepts anything; an external address only receives assets of its own chain family, and a wrong-chain
  send is blocked rather than routed.
- Fixture sets for **Contacts, Activity, dApps and Approvals pages** exist (`data/apps.ts`,
  `data/packs.ts`, `data/approvals.ts`) but those destinations aren't built — the nav items are
  placeholders. Out of scope this pass: cross-chain routing, River, real conversion in My Assets.
  The Handoff countdowns are placeholders (canon PS-Q, still open).
