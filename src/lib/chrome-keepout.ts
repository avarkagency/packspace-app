// The top-right chrome's live keep-out box, in pixels measured from the viewport's top-right corner:
// `w` how far in from the right edge, `h` how far down from the top. The widget grid updates this as it
// grows and shrinks; the desk's placement clamp (`clampPos`) reads it so an icon can never park under the
// search bar or the widget bento and become unreachable behind them. Mutable module state on purpose —
// the clamp is a hot, non-reactive function called from every drag frame, so it reads plain fields rather
// than threading React state through every call site.
//
// Defaults match a single 2-column Balance widget: 392 wide (the search bar's reach) and 176 tall.

export const chromeKeepout = { w: 392, h: 176 }
