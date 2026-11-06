// ===========================================================================
// Unit size labels, straight from the Hummingbird tier `description`.
//
// Some tenants author whole-foot sizes with a trailing ".0" — "4.0' x 5'",
// "10.0' x 15'" (live on Storage Outlet, seen 2026-11-03) — which reads as a
// mistake next to the plain "5' x 5'" pills around it. Only a literal ".0" is
// dropped: a real fraction ("12.8' x 12.8'") keeps its decimal, and "4.05"
// is untouched because the 0 is followed by another digit.
//
// Applied where a tier description becomes a display size (#05 space list,
// #07/#05 nearby cards, #20 map locations, #14 tier selection, #99 rental
// flow), so the card, the pills, the hand-off URL and the order rail all
// print the same label.
// ===========================================================================

/** "4.0' x 5'" → "4' x 5'"; "12.8' x 12.8'" unchanged. */
export function tidyDimensions(desc: string): string {
  return desc.replace(/(\d+)\.0(?!\d)/g, '$1');
}
