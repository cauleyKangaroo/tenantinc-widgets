// ===========================================================================
// The flow registry — the one list the Static screens page renders.
//
// To add a flow:
//   1. Create a folder under flows/ (copy flows/example/ as a starting point).
//   2. Export a `Flow` from its index.ts.
//   3. Add it to FLOWS below. Order here is the order in the picker.
// ===========================================================================

import type { Flow } from '../types';
import { exampleFlow } from './example';
import { rentalFlow } from './rental-flow';

export const FLOWS: Flow[] = [rentalFlow, exampleFlow];
