import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, clientAmendmentAllowed, deliveryBucket } from '../src/lib/workflow-core.mjs';

test('roles can only perform permitted transitions', () => {
  assert.equal(canTransition('editor','Editing','Submitted for Review'), true);
  assert.equal(canTransition('editor','Submitted for Review','Manager Approved'), false);
  assert.equal(canTransition('client','Client Review','Approved for Posting'), true);
  assert.equal(canTransition('client','Submitted for Review','Done'), false);
});

test('client amendment token cap is exactly three', () => {
  assert.equal(clientAmendmentAllowed(0), true);
  assert.equal(clientAmendmentAllowed(2), true);
  assert.equal(clientAmendmentAllowed(3), false);
  assert.equal(clientAmendmentAllowed(4), false);
});

test('delivery metrics distinguish early, deadline day, and late', () => {
  assert.equal(deliveryBucket('2026-08-24T12:00:00Z','2026-08-23T12:00:00Z'),'EARLY!');
  assert.equal(deliveryBucket('2026-08-24T12:00:00Z','2026-08-24T15:00:00Z'),'DEADLINE DAY');
  assert.equal(deliveryBucket('2026-08-24T12:00:00Z','2026-08-25T12:00:00Z'),'LATE DELIVERY');
});
