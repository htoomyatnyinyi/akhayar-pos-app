# Offline POS Runtime

This folder contains the local-first runtime for the mobile POS app.

## What is offline writable

- Orders are created locally first when the device is offline or when the backend cannot be reached.
- Product stock is decremented locally at sale time so the cashier sees immediate inventory feedback.
- A durable `sync_outbox` row is created for every offline order and retried with exponential backoff.

## What is offline readable

- Products and barcode lookups are cached in SQLite whenever the online product APIs succeed.
- Product queries fall back to the SQLite cache when offline.

## Conflict policy

- Orders are append-only from the app, which keeps sync conflicts small and auditable.
- Product catalog data is server-owned. The app caches it but does not make offline product edits yet.
- Failed queued orders remain in the outbox with the backend error for later retry/inspection.

## Production notes

- Keep local IDs distinct from server IDs with the `ord_` prefix.
- Do not delete failed outbox rows from UI code; retry or mark them resolved after operator review.
- Add backend delta endpoints (`updatedAfter`, tombstones, and cursors) before expanding pull sync to every Prisma model.
