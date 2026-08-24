export function canTransition(role:string, from:string, to:string): boolean;
export function clientAmendmentAllowed(used:number): boolean;
export function deliveryBucket(deadline:string|null, deliveredAt:string|null): string|null;
export function transitionOptions(state:string): string[];
export const WORKFLOW_STATES: string[];
