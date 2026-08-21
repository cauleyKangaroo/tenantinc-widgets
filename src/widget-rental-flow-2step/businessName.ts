// ===========================================================================
// Business-name handling, shared by step 1 and step 2.
//
// Its own module rather than an export from RentalFlow2Step: that file already
// imports Step2, so Step2 importing back would be a cycle.
// ===========================================================================

/**
 * A business name → the `first`/`last` the contact API insists on.
 *
 * Renting as a business asks for ONE name, but `contacts[].first` and `last`
 * are both required by documents/finalize and lease, and a lease cannot be
 * filed without them. So the trading name is split positionally on the first
 * space: "Kangaroo Storage Ltd" becomes first "Kangaroo", last "Storage Ltd",
 * which reads sensibly in a list of tenants.
 *
 * A single word repeats itself into `last` rather than leaving it empty — a
 * blank surname is rejected, and repeating is the least surprising filler.
 *
 * The name the operator actually typed is kept verbatim on `Contact.businessName`,
 * so nothing downstream has to reassemble it from a split that was never a real
 * first and last name.
 */
export function splitBusinessName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: '', last: '' };
  const [head, ...rest] = parts;
  return { first: head, last: rest.length ? rest.join(' ') : head };
}
