# PackSpace — prototype

A design-mode prototype of **PackSpace**, the alternative visual wallet for the Project G ecosystem
(spec: `ProjectG_v2_0_AvarkUXUISpec_Part3_PackSpace`). Sibling to **Aboyz** and **Gacha Labs**; shares
their stack and px design-scale system, with its own identity.

This pass covers **three surfaces**:

1. **The dashboard** — a conventional desktop-app shell: left sidebar nav + top filter bar + full-bleed
   asset grid.
2. **Send** — direct one-way transfer (no recipient confirmation).
3. **Handoff** — the confirmed two-sided exchange with the full lock → review → confirm → launch machine.

## Shell & interaction

- **Left sidebar** = top-level navigation. Built: **My Assets**. Docs-backed but **not built** (nav item
  only, opens a placeholder): **Contacts**, **Activity**, **dApps** (spec §3.13 launcher), **Approvals**
  (spec §3.11 Approval Radar). macOS window chrome + wallet identity at top, user profile at the bottom.
- **Top filter bar** — search + quick-filter chips **Tokens · Packs · NFTs** + sort + running total.
  The chips start all-on, where a click means "show me only this" rather than "hide this": from every
  group visible, hiding one is rarely what you meant, and soloing takes one click instead of two.
  Clicking off the last group left restores all of them — it reads as "done filtering", and between the
  two rules all-off is unreachable, so there's no way to strand yourself on an empty grid. Sort is
  a real `<select>` — cheaper and more accessible than a hand-rolled popover, and its list is the
  platform's own, which "never fake an OS" (spec §3.1 / DEV2) argues for rather than against.
- **Asset grid** — fixed 4-column hairline lattice, cells butted together with no surface or radius: the
  **3D object** is the tile. Only the holding and its value sit under each one, plus a network badge. The
  last row pads out with empty cells so the lattice stays a continuous field.
- **Hover readout** — hovering an object raises a panel that trails the cursor, carrying exactly what the
  cell doesn't already say: the name, the type, the network's name and the raw address. It's the only
  place an object's detail lives now — packs included, which no longer respond to a click at all. Text resolves in
  with a scramble (`BaseScrambleText`, GSAP). Hover is scoped to the **object**, not the cell — the cell
  is mostly the space around it — while dragging still starts anywhere in the cell, because a drag wants
  the big target and a readout doesn't.
- **Dragging dims the field.** Every cell that can't take the coin in hand — cell *and* coin — fades to
  40%; the ones holding the same token stay lit. The fade is the affordance for **Combine**.
- **Contacts panel** — a **permanent** right rail (not a drawer), and nothing but a list of people. Each
  contact's **Send** / **Trade** zones stay collapsed to nothing and slide open only when there's a coin
  to act on. **New contact** at the foot is the slot the address-lifecycle flow lands in — inert for now.
- **Split dock** — parked off the bottom edge, slides up when there's a coin to act on. Split needs no
  counterparty, so it lives with the objects rather than in the contacts rail. Fungible coins divide; a
  one-of-one is refused on approach.
- **One button, three signals** (`ActionZone`) — Send, Trade and Split are the same gesture with
  different consequences, so they're the same control: caution-hatched, labelled, no icon. Only the
  colour says which, and each has a signal of its own (`--action-send` green, `--action-trade` blue,
  `--action-split` amber) rather than borrowing the chrome's cyan. Every zone is both a drop target and a
  button for the selected asset.
- **Combine** — Split's inverse, and the one action with no zone of its own: drop a coin **onto another
  cell holding the same token** to pour the two portions back together. Only valid targets carry a
  `data-drop`, so a drop can never land somewhere it won't resolve — and `over` doesn't churn (and
  re-render every subscriber) on each cell crossed.
- **Send / Trade / Split / Combine** open as **centered modals**. **Split** is the reworked one: a
  chamfered panel that scales in from its own centre, outlined in accent at half strength, translucent
  over a blurred backdrop.

  A cut panel's outline is **two clipped layers, not a border** — `clip-path` cuts a border away on the
  diagonals and leaves it on the straight edges, which reads as a mistake. The outer box *is* the line
  (one pixel of padding); the inner clips the same shape back out in the panel's colour, so the outline
  follows the chamfer the whole way round and the translucency shows the grid through the panel rather
  than through the line.

  Its **ratio bar** carries the drop zones' hatching — the bar and the dock you dragged onto are the same
  action — over a base in Split's amber, and the handle's 2px ring is the panel's own colour, so it reads
  as a gap rather than a border. A real `<input type="range">` rides on top, invisible: it keeps the
  keyboard and pointer behaviour a hand-built slider would have to reimplement badly.

  **The bar drives Portion A, the one drawn on the left**, so it fills toward the portion it's pointing at
  rather than the one opposite it. It used to drive B — which also made the quick chips lie: `25/75` set
  A to *75%*.

> **Handoff is "Trade" to the user.** The rename covers what's read — the zone, the modal title, the
> receipt's action — while the internals stay `handoff`: the drop key, `HandoffWindow`, and the dApp of
> that name in `data.ts` (a separate product). The spec calls the machine Handoff (§3.5.2), so the two
> names now coexist deliberately rather than by drift.

> Both the zones and the dock reveal on a **drag or a selection**. Drag alone would strand the click
> path — tapping a coin would leave every action unreachable, and the zones double as buttons for the
> selected asset (spec §3.5.4).

## The object layer

The DOM stays the source of truth. A single full-viewport `<Canvas>` overlays it and draws an object into
the box each card reserves — the DOM keeps layout, hit-testing, scrolling and labels, so the existing
pointer/drop machinery is untouched and there are no DOM overlays to reproject per frame.

**Shapes.** How an object *behaves* — where it sits, how it turns, lifts, flies home, clips and fades —
is identical whatever it looks like, so `ObjectMesh` owns all of that and the shape only decides which
meshes hang off the size group at the end. Built: **coin** (tokens, stablecoins, stacks, packs) and
**nft** (a polaroid — rounded white card, slight depth, the art inset behind a fine white border, front
and back). Packs and stacks are still coins; their own shapes are still to come.

**Artwork** (`object-art.ts`) is keyed by symbol and loaded once per symbol, shared across every object
holding it — split portions must not each decode their own copy. A symbol with no entry keeps the face
the coin draws for itself, so the fallback is a live path, not dead code: FOIL and the packs run on it.

- **A coin's rim takes its colour from the art**, sampled from the image's top-left 2×2 (a token mark
  sits on a flat field, so that corner *is* the field). Guessing a tint instead leaves the coin reading
  as a face stuck on a differently-coloured blank.
- **Every flat face is unlit** (`MeshBasicMaterial`, `toneMapped: false`) — coin faces and the polaroid's
  picture alike. Only the rim is metal.

  This is the ortho camera's doing, and it's worth understanding before "fixing" it. Under an
  orthographic projection every point on a flat face-on surface shares one view vector, so a metal face
  reflects a *single constant* of the environment across its whole area — sample it and every pixel comes
  back byte-identical. That isn't a reflection, it's a uniform wash sitting on the artwork, which is why
  faces read pale against their own source images and why turning one (on hover) looked right: the
  reflection vector finally moved. Unlit costs the face nothing it was getting, and `toneMapped: false`
  takes it around ACES too, so art lands at exactly its authored colour — USDC measures `#2775ca` on
  screen against `#2775ca` in the file. The rim is curved, so it still catches the environment properly
  and carries the coin. Raising the light intensity or lowering metalness only moves this wash around.

- **Orthographic camera, 1 world unit = 1 px** — a coin's position is just its card's client rect, and
  every coin renders identically (a perspective camera would skew the ones at the edges).
- **`src/lib/coin-store.ts`** — card rects, hover, cursor. Outside React, like `drag-store`: the frame
  loop reads it every tick and must never cause a render.
- **Rects are measured every frame, from inside the render loop.** A scroll/resize dirty flag defers the
  read to the frame *after* the event, and scroll events aren't guaranteed to land before that frame's
  rAF — so the labels scrolled and the coins arrived late, reading as the coin sliding around on its own
  card. A dozen batched rect reads cost one layout flush; far cheaper than that lag looked.
- **Clipping** — resting objects clip to the grid's scroll viewport via `THREE.Plane`s; one in hand
  swaps to a pushed-out set so it can fly over the chrome, and keeps reading it the whole way home or
  it'd be sliced off at the grid's edge on the way back. Each object owns its plane array, so swapping
  can never recompile a shader. The split dock registers as a *floor* (`registerCoinFloor`): the canvas
  draws above the whole shell, so without clipping against it the objects would render straight over the
  dock as it slides up.
- **Release flies home** rather than snapping: the object eases from wherever it was dropped back to its
  cell (~250ms), then hands its position back to the measured rect.
- **A dragged object sits at `z=500`, and every resting one holds still.** Ortho, so z only orders it in
  front — but it has to clear the grid by more than an object's radius, because a spinning one sweeps its
  whole radius through z as it passes edge-on. At a small offset the two intersect and slice through each
  other; stopping the resting ones spinning removes the other half of that.
- **Cards must not move on hover.** A CSS transform would shift the slot without the canvas knowing, and
  the coin would drift off it. The coin's own spin/scale is the hover feedback.
- **The coin slot is a fraction of its cell, not a fixed px box.** With four locked columns a fixed coin
  outgrows its cell as the viewport narrows and the grid collapses into overlapping discs. Anything
  keyed to the coin's size (the drag label's offset) derives it from the measured rect.
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

A cyberpunk terminal, matched to the Gacha Labs design (Figma `611:56`). Every value in `:root` is
**sampled from that file rather than eyeballed** — `#00ddff` accent, `#ff4665` for a negative, `#2b3745`
for the lattice, `#001222` navy, `#85929a` muted.

- **Victor Mono is the voice, not an accent** — it's the body font (with the `ss02` stylistic set the
  design sets on it), carrying the chrome and every value. **Inter** appears in exactly one place: the
  cells' cyan sub line, as the counterweight. Casing is set per component and never globally: a blanket
  `uppercase` would render every address as `0X8335…2913`.

  Traps in this stack, every one of which fails *silently*. Check the computed style; don't trust the
  screenshot:
  - **Keep `* { border-color }` inside `@layer base`.** Unlayered, it beats every layer — `utilities`
    included — and kills every `border-{color}` utility in the app: `border-accent`, `border-danger`, the
    lot all resolve to `--border`, and nothing looks broken enough to notice. It's a Tailwind v3 idiom,
    where preflight was itself layered and an unlayered default lost to utilities.
  - **Lightning CSS drops a whole `@utility` if one declaration won't parse.** `color-mix()` with
    double-position colour stops (`… 0 1.2px`) took `fui-hazard` out entirely — no warning, no rule, just
    absent from the output while its neighbours compiled. If a utility silently doesn't exist, grep the
    served CSS for it before suspecting anything else.
  - **`font-mono` has to be the utility on `<body>`, not `font-family: var(--font-mono)` in CSS.** The
    theme block is `@theme inline`, which inlines its values into utilities and never emits them as
    custom properties — so `var(--font-mono)` resolves to nothing and the whole declaration falls back to
    system sans. It looked close enough under uppercase + letter-spacing to go unnoticed for a while.
  - **`tailwind-merge` reads `text-14` as a colour.** Its stock config only knows t-shirt sizes in the
    font-size group, so `cn("text-14", "text-foreground")` treated them as a conflict and dropped the
    size. `cn` now extends the merge with our pixel scale (`src/lib/utils.ts`). Only `cn` call sites were
    affected — plain `className` strings never pass through the merge, which made it look font-specific.
- **Corners, not outlines.** Marked cells take corner brackets over a tinted fill and leave their lattice
  edges alone. That's how the design does it: probe the pixels and the corner is `#00ddff` while the
  edges stay dark. `fui-brackets` + `fui-cell-live`. (This reverses an earlier pass that dialled the HUD
  *down*; the brackets and hairlines are the point now.)
- **The hover marker is one element that travels**, not a treatment each cell paints for itself — a cell
  can't slide to its neighbour. It lives in `AssetGrid`, moves on cell enter, and fades when the pointer
  leaves the grid. Every cell is identical in size, so only its position animates. It stands down during
  a drag, which has its own language (the field dims, targets light up). A *merge target* still marks
  itself: several are lit at once, so that one can't be the single travelling marker.

  It's sized to each cell's **content** box (`clientWidth/clientHeight`), not its border box. Cells paint
  after it, so their solid `border-r`/`border-b` land straight on its right and bottom bracket arms and
  slice them off. And the grid is `overflow-x-hidden` for a reason: setting only `overflow-y` computes
  `overflow-x` to `auto`, and since the marker is placed from *rounded* offsets, any viewport where the
  four columns don't divide evenly (1437px → 179.25px columns) put it ~1px past the edge and raised a
  horizontal scrollbar.
- **The action zones speak their own colours, not cyan** — caution hatching in `--action-*`. The stripes
  are drawn in CSS from the design's own exported SVG geometry (48.57°, 1.2px thick, 6px apart) rather
  than shipping the export as an asset, so each zone tints them by setting `--zone-stripe`. Their alpha
  goes through `color-mix()` rather than the codebase's usual hex-alpha suffix — these are `var()`s, and
  you can't concatenate onto one.
- **Avatars are the address** (`@outpacelabs/avatars`): the gradient is seeded by the wallet address, so
  a contact's avatar can't collide with another's and changes if the address does. `WALLET` in `data.ts`
  holds your address in full for the same reason — it seeds the avatar as well as being displayed.
- **A selected cell has no mark of its own** — selection arms the rail and the split dock instead. The
  travelling marker owns that treatment, and the design only ever lights one cell.
- **Radii are stated, not derived.** Near-square throughout — deriving a `sm` from a 2px base lands on a
  negative.
- **The headline leads with the money.** The total moved out of the corner into the content column's
  header, big and monospace, with its change beside it.
- **The card leads with the money too** — big white USD, the holding as its cyan footnote. That's the
  reverse of what it was.

> Not everything in this surface is designed yet: the contacts rail and the sidebar's foot are empty in
> the Figma, so they're themed to match rather than copied. Nothing was dropped for not appearing there —
> the filter chips, sort, item count, nav icons and counts all survive.
>
> `BALANCE_DELTA` in `data.ts` is invented. The design shows a change figure; nothing here models price
> history, so it's a fixed fixture rather than anything derived.

> Note: the earlier "system log" was a non-spec embellishment and has been removed. "Desktop feel, dApp
> reality" still holds (spec §3.1 / DEV2: never fake an OS) — this is a workspace's look, not an OS's.

## Run

- **Node 22** (`.nvmrc` = 22.14.0). `nvm use` then `npm install`, `npm run dev` → http://localhost:3000.
  (Aboyz also defaults to 3000 — run one at a time, or `npm run dev -- -p 3007`.)
- Validate: `npx tsc --noEmit` and `npx eslint "src/**/*.{ts,tsx}"`.
- Stack: Next 16 (App Router, Turbopack) · React 19 · Tailwind v4 (`@theme` in `globals.css`) ·
  React Three Fiber + three (the object layer) · lucide-react. All data is fake (`src/lib/data.ts`).
- The React Compiler lint is on and strict: no mutating what a hook returned, no `setState` in an effect
  body. That's why shared mutable state lives in module stores and the env map is `attach`ed rather than
  assigned onto the scene.

## How to drive it

1. Toggle the **Tokens / Packs / NFTs** chips or search to filter the grid.
2. **Hover a coin** → it spins. **Drag one** → it lifts out of its cell and flies at the pointer, the
   contacts' zones slide open and the split dock rises into view.
3. **Drop on Split** (foot of the grid) → divide a coin into two portions. Try dragging **Genesis Pass**
   there — a one-of-one is refused. **Click an asset** instead to select it and use the zones as buttons.
4. **Drag one portion onto the other** → the unrelated cells fade back, the twin lights up, and dropping
   recombines them. The total is identical before and after.
5. Pick a contact → **Send** or **Handoff**.
   - **Send:** amount → Transaction Interpreter + Safety Engine → sign. High-value = type-to-confirm. Try
     **ghost.eth** (blocked — compromised) or **Dez** (retired).
   - **Handoff:** lock your side → counterparty locks → 3s locked review → confirm exact terms →
     all-or-nothing launch → receipt. "+ Request something back" flips a send into a trade (header +
     summary rewrite live); edit a locked slot to watch the locks break.

## File map

- `src/lib/{types,data,utils}.ts` — object system, fake data, formatters.
- `src/lib/asset-ops.ts` — split / same-token / combine rules + the asset drop-key helpers.
- `src/lib/{drag,coin}-store.ts` — the two out-of-React stores (drag state; coin screen geometry).
- `src/components/shell/` — `Sidebar`, `FilterBar`, `AssetCard`, `AssetGrid`, `ContactsPanel`,
  `SplitDock`, `DragGhost`, `ObjectHoverInfo`, `NavPlaceholder`.
- `src/components/base/` — `BaseScrambleText` (GSAP; plays on mount, so `key` it to replay).
- `src/components/windows/` — `Window` (modal shell) + `SendWindow`, `HandoffWindow`, `SplitWindow`,
  `CombineWindow`, `ReceiptWindow`.
- `src/components/windows/reference/` — **parked, not wired up.** The full Send and Handoff machines,
  verbatim, while their design is reworked; the live ones are stubs with the real prop signatures, so
  bringing them back touches nothing in the workspace. They're kept as compiling `.tsx` on purpose —
  there's no git history here to recover them from, and if a shared type moves under them you'll hear
  about it now rather than on the day you re-wire them.
- `src/components/canvas/` — `ObjectScene` (canvas + camera + clip rig), `ObjectMesh` (one object: all
  the shared behaviour, plus a body per shape), `{coin,nft}-geometry.ts` (geometry, textures, materials
  per shape), `object-art.ts` (real artwork + base-colour sampling), `clip-planes.ts`, `objectVisual.tsx`
  (icon / colour mapping — `objectTint()` is the single funnel every tint reads through).
- `public/images/{tokens,nfts,chains}/` — object artwork and network marks.

> **`next/image` is `unoptimized` for the network badges.** At 28px Next requests a `w=32` variant, and
> its dev converter drops the connection on three of the four marks — only whichever it has already
> cached survives, which looks exactly like a broken mapping. They're 200px local files shown at 28px;
> there is nothing to optimise. Larger widths convert fine, so this is specific to the small variant.
- `src/components/workspace/PackSpaceWorkspace.tsx` — the shell: nav + filters + grid + contacts panel +
  modal manager.

## Spec fidelity notes

- **Handoff** implements the §3.5.2 Lock-then-Confirm machine: two-confirmation invariant (both sides,
  every mode), locked-review countdown, break-locks-on-edit, all-or-nothing launch, free cancel
  pre-launch, self-writing summary + live header, receipt on settle.
- **Send** has no recipient confirmation (it's a give); Handoff is the confirmed path.
- **Split** is asset division — a pure UX convenience that prepares portions for a separate Send or
  Trade — and **Combine** is its inverse. Nothing settles and no chain semantics are implied; a
  split-then-combine round trip leaves the holding and the total untouched. **PLANNED — phase placement
  still open**, so both flows are deliberately minimal. They're the only actions that mutate `ASSETS`
  (lifted into state in `PackSpaceWorkspace`); everything else reads fixture data.
- **A split doesn't move anything.** The original survives — same id, same cell, lighter — and the clone
  lands beside it. Both carry the pre-split value as `sortUsd`, which is what a value sort ranks on, so
  the pair holds the slot the whole object had. Without it, halving your largest holding throws both
  halves down the grid and the thing you were working on vanishes from under the cursor. The sort is
  stable, so equal ranks keep insertion order: original, then clone.

  **Changing the sort drops every pin.** That rank is a courtesy for the moment of the split, not a claim
  about what a portion is worth — ask for a different sort and you want the truth.
- **The clone announces itself** with an amber pulse (`fui-clone`) — the split's own signal. It lands
  next to an identical-looking twin, and nothing else says which one is new. Background and the cell's
  own lattice edge light together, in one stroke: snap on, then decay across the rest of the run. The
  asymmetry comes from per-keyframe timing functions — a single easing on the shorthand would give the
  fade the same haste as the arrival. It clears itself after ~1.8s: an announcement, not a state.
- `src/lib/asset-ops.ts` holds the object rules — what splits, what counts as the same token, what can
  combine. Combine matches on **token + chain** rather than on split lineage: splitting is the only way
  a wallet ends up holding one token twice, so in practice those are always portions, and matching the
  token just means it keeps working if they ever arrive by another route.
- **Safety** cues: Transaction Interpreter, Safety Engine states (safe / caution / blocked), RETIRED +
  COMPROMISED destinations, high-value type-to-confirm. Note the rail no longer shows trust tags, so
  those states now surface only once a Send / Handoff is open.
- **The Inspector is gone.** The hover readout carries what it carried — type, network, contents, the
  raw address — without a modal, for every object rather than just the ones with a way in. Worth knowing
  against DEV5 (truth-always-available): the readout is hover-only, so there's no pinned, copyable,
  keyboard-reachable view of an object's truth any more. If that's wanted back, it's a new surface, not
  a revert.
- Out of scope this pass: cross-chain routing, River, the AI Inspector, the Approval Radar /
  dApps / Activity pages, real conversion in My Assets. `HIGH_VALUE_USD` + countdowns are placeholders
  (canon PS-Q, still open).
