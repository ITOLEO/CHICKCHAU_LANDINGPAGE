/**
 * Firestore Security Rules Specification & Dirty Dozen Verification Suite
 */
export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Order Create',
    collectionPath: '/orders/ORD-20261026-ABC123',
    operation: 'create',
    auth: null,
    payload: {
      orderId: 'ORD-20261026-ABC123',
      idempotencyKey: 'idem_12345678',
      payloadHash: 'a'.repeat(64),
      productIds: ['capcin'],
      totalQuantity: 1,
      orderSubtotal: 7000,
      provisionalTotal: 7000,
      deliveryFeeStatus: 'unconfirmed_whatsapp',
      currency: 'IDR',
      status: 'pending_whatsapp',
      isPaid: true
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'Initial Status Shortcutting (status = completed on create)',
    collectionPath: '/orders/ORD-20261026-ABC123',
    operation: 'create',
    auth: null,
    payload: {
      orderId: 'ORD-20261026-ABC123',
      idempotencyKey: 'idem_12345678',
      payloadHash: 'a'.repeat(64),
      productIds: ['capcin'],
      totalQuantity: 1,
      orderSubtotal: 7000,
      provisionalTotal: 7000,
      deliveryFeeStatus: 'unconfirmed_whatsapp',
      currency: 'IDR',
      status: 'completed'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'Zero or Negative Price Manipulation on Order Item',
    collectionPath: '/orders/ORD-20261026-ABC123/items/capcin',
    operation: 'create',
    auth: null,
    payload: {
      orderId: 'ORD-20261026-ABC123',
      productId: 'capcin',
      productName: 'Cappuccino Cincau',
      unitPrice: 0,
      quantity: 1,
      lineSubtotal: 0
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'ID Poisoning Attack with malformed Order ID',
    collectionPath: '/orders/INVALID_JUNK_ID_123',
    operation: 'create',
    auth: null,
    payload: {
      orderId: 'INVALID_JUNK_ID_123'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'Unauthenticated Customer PII Read',
    collectionPath: '/orders/ORD-20261026-ABC123/private/pii',
    operation: 'get',
    auth: { uid: 'random_user_1', email: 'user@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Email Spoofing Attack (email_verified = false)',
    collectionPath: '/orders/ORD-20261026-ABC123',
    operation: 'get',
    auth: { uid: 'spoof_admin', email: 'itleo4444@gmail.com', email_verified: false },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Self-Assigned Admin Privilege Escalation',
    collectionPath: '/admins/attacker_uid',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: {
      uid: 'attacker_uid',
      email: 'attacker@example.com'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Orphaned Order Item Write without Parent Order',
    collectionPath: '/orders/ORD-20261026-ORPHAN/items/capcin',
    operation: 'create',
    auth: null,
    payload: {
      orderId: 'ORD-20261026-ORPHAN',
      productId: 'capcin',
      productName: 'Cappuccino Cincau',
      unitPrice: 7000,
      quantity: 1,
      lineSubtotal: 7000
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Immutable Field Mutation (modifying orderSubtotal on update)',
    collectionPath: '/orders/ORD-20261026-ABC123',
    operation: 'update',
    auth: { uid: 'admin_uid', email: 'itleo4444@gmail.com', email_verified: true },
    payload: {
      orderSubtotal: 100,
      status: 'confirmed'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'Public Catalog Price Tampering by Non-Admin',
    collectionPath: '/catalog/capcin',
    operation: 'update',
    auth: { uid: 'regular_user', email: 'customer@example.com', email_verified: true },
    payload: {
      id: 'capcin',
      name: 'Cappuccino Cincau',
      shortName: 'Capcin',
      unitPrice: 1000,
      available: true
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Value Poisoning on Status Update (invalid enum value)',
    collectionPath: '/orders/ORD-20261026-ABC123',
    operation: 'update',
    auth: { uid: 'admin_uid', email: 'itleo4444@gmail.com', email_verified: true },
    payload: {
      status: 'hacked_status'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Timestamp Forgery (client-supplied string instead of request.time)',
    collectionPath: '/orders/ORD-20261026-ABC123',
    operation: 'create',
    auth: null,
    payload: {
      orderId: 'ORD-20261026-ABC123',
      createdAt: '2020-01-01T00:00:00Z'
    },
    expectedResult: 'PERMISSION_DENIED'
  }
];
