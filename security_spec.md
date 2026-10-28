# CHICKCHAU Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default Deny**: All unspecified paths (`/{document=**}`) deny all reads and writes.
2. **Authoritative Pricing (`/catalog/{productId}`)**:
   - Anyone can read `/catalog/{productId}` for valid product IDs (`capcin`, `shihlin`).
   - Only a verified administrator (`isAdmin()`) can create or update `/catalog/{productId}`, and `unitPrice` must be an integer between `1000` and `1000000` IDR.
   - No client can delete catalog documents.
3. **Order Integrity (`/orders/{orderId}`)**:
   - `orderId` must match `^ORD-[0-9]{8}-[A-Z0-9]{6}$`.
   - Orders must only be created in the initial state `status == 'pending_whatsapp'` with `currency == 'IDR'`, `deliveryFeeStatus == 'unconfirmed_whatsapp'`, `orderSubtotal >= 7000`, `provisionalTotal == orderSubtotal`, and `createdAt == request.time`.
   - Unauthenticated users cannot list or read `/orders/{orderId}` directly from Firestore (public order creation/lookup is mediated by the Express backend `/api/orders` which enforces idempotency and server-side price calculation; direct Firestore reads/lists of orders are restricted to verified administrators `isAdmin()`).
   - Once an order reaches a terminal state (`completed` or `cancelled`), no further updates are permitted unless overridden by `isAdmin()`.
   - Immutable fields (`orderId`, `idempotencyKey`, `payloadHash`, `productIds`, `totalQuantity`, `orderSubtotal`, `currency`, `createdAt`) cannot be modified during updates.
4. **PII Isolation (`/orders/{orderId}/private/pii`)**:
   - Customer PII (`customerName`, `customerPhone`, `deliveryAddress`, `googleMapsUrl`, `notes`) is isolated in the `/orders/{orderId}/private/{docId}` subcollection (`docId == 'pii'`).
   - Only verified administrators (`isAdmin()`) can read `/orders/{orderId}/private/pii`.
   - Creation requires the parent `/orders/{orderId}` document to exist (`exists(...)` or `existsAfter(...)`).
5. **Line Item Relational Sync (`/orders/{orderId}/items/{itemId}`)**:
   - Line items can only exist if parent `/orders/{orderId}` exists (`exists(...)` or `existsAfter(...)`).
   - `itemId` and `productId` must be `'capcin'` or `'shihlin'`, `quantity` must be `1..50`, and `lineSubtotal == unitPrice * quantity`.
6. **Administrator Privilege Protection (`/admins/{adminUid}`)**:
   - Users cannot self-assign admin privileges. Only the bootstrapped verified owner email (`itleo4444@gmail.com` with `email_verified == true`) or an existing admin can manage `/admins/{adminUid}`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Order Create**: Adding `"isPaid": true` to `/orders/ORD-20261026-ABC123`.
2. **Initial Status Shortcutting**: Creating an order with `status: "completed"` instead of `"pending_whatsapp"`.
3. **Zero or Negative Price Manipulation**: Creating an order item with `unitPrice: 0` or `lineSubtotal: -5000`.
4. **ID Poisoning Attack**: Creating an order with a 1.5KB junk document ID or invalid format `ORD-INVALID`.
5. **Unauthenticated PII Read**: Attempting `get` or `list` on `/orders/ORD-20261026-ABC123/private/pii` without admin privileges.
6. **Email Spoofing Attack**: Authenticated user with `email: "itleo4444@gmail.com"` but `email_verified: false` attempting to read orders or update catalog prices.
7. **Self-Assigned Admin Escalation**: Authenticated regular user writing their own UID to `/admins/{uid}`.
8. **Orphaned Order Item Write**: Writing to `/orders/ORD-20261026-ORPHAN/items/capcin` when the parent order document does not exist.
9. **Immutable Field Mutation**: Updating `orderSubtotal` or `createdAt` on an existing `/orders/{orderId}` document.
10. **Terminal State Bypass**: Non-admin attempting to update an order whose existing `status` is `"completed"`.
11. **Value Poisoning on Status Update**: Admin/actor updating `status` to a 1MB string or boolean `true` instead of a valid enum value.
12. **Timestamp Forgery**: Creating or updating an order with a past/future `createdAt` or `updatedAt` that does not equal `request.time`.
