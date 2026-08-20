# Offline sync recovery

The app uses an outbox queue. Local changes are written first, then uploaded when a connection is available. A failed upload must not prevent the operator from continuing to work offline.

## Recovery policy

1. **Retry** transient failures (offline network, timeout, 5xx). Use **Retry All** or the retry button for one item.
2. **Fix, then retry** permanent failures (validation errors, unauthorized requests, missing records, duplicates). The failed item shows the server error and attempt count.
3. **Discard one change** when the local change is no longer wanted. This removes only its outbox entry; cached products, orders, and other local records stay intact.
4. **Remove Failed** clears only `failed` and `dead` outbox entries. It is appropriate after the operator has reviewed the errors or when the server record was corrected separately.
5. **Clear Outbox** removes every queued request, including pending work. It does not clear cached data, but removed changes will not upload automatically.
6. **Clear Offline Database** is a last resort. It deletes the local cache and queue, then signs the user out so the app can bootstrap a clean dataset from the server.

An item is moved to `dead` after repeated attempts (currently ten). Dead entries are excluded from normal due-work, so they do not block healthy changes. They remain visible for review until discarded or removed with **Remove Failed**.

## Operational guidance

- Keep retrying while the error is clearly network-related.
- For 401/403, sign in again or correct the user permission before retrying.
- For 404, verify that the referenced server record still exists; discard the stale local change if it cannot be reconciled.
- For 409/duplicate or validation errors, reconcile the record once, then discard or retry the specific item.
- Do not clear the whole database as a routine sync fix. If the queue contains valuable unsent sales, export/reconcile them first.

