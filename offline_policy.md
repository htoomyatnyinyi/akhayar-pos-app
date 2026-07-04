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
  services/
  ├── api/
  │ ├── client/
  │ │ ├── apiClient.ts # Shared HTTP client
  │ │ ├── types.ts # API client types
  │ │ └── errors.ts # API error classes
  │ ├── endpoints/
  │ │ ├── productApi.ts # Product endpoints
  │ │ ├── orderApi.ts # Order endpoints
  │ │ ├── sessionApi.ts # Session endpoints
  │ │ ├── customerApi.ts # Customer endpoints
  │ │ ├── categoryApi.ts # Category endpoints
  │ │ ├── storeApi.ts # Store endpoints
  │ │ └── inventoryApi.ts # Inventory endpoints
  │ ├── posApi.ts # RTK Query configuration
  │ └── types.ts # Shared API types
  │
  ├── features/
  │ ├── auth/
  │ │ ├── authSlice.ts
  │ │ ├── authTypes.ts
  │ │ └── authSelectors.ts
  │ ├── cart/
  │ │ ├── cartSlice.ts
  │ │ ├── cartTypes.ts
  │ │ └── cartSelectors.ts
  │ ├── ui/
  │ │ ├── uiSlice.ts
  │ │ └── uiTypes.ts
  │ ├── settings/
  │ │ ├── settingsSlice.ts
  │ │ └── settingsTypes.ts
  │ └── offline/
  │ └── offlineSlice.ts # Offline state
  │
  ├── offline/
  │ ├── database/
  │ │ ├── index.ts
  │ │ ├── db.ts # Database connection
  │ │ ├── schema.ts # Drizzle schema
  │ │ ├── repository.ts # Database operations
  │ │ └── migrations.ts # Database migrations
  │ ├── sync/
  │ │ ├── index.ts
  │ │ ├── syncManager.ts # Main orchestrator
  │ │ ├── syncOrchestrator.ts # Sync pipeline
  │ │ ├── syncProducts.ts # Product sync
  │ │ ├── syncOrders.ts # Order sync
  │ │ ├── syncSessions.ts # Session sync
  │ │ ├── syncOtherEntities.ts # Other entities sync
  │ │ ├── stockChecker.ts # Stock validation
  │ │ ├── retryManager.ts # Retry logic
  │ │ ├── queueProcessor.ts # Outbox processing
  │ │ └── syncTypes.ts # Sync types
  │ ├── queue/
  │ │ ├── outbox.ts # Outbox operations
  │ │ └── queueTypes.ts
  │ ├── hooks/
  │ │ └── useSync.ts # React hook
  │ └── index.ts # Main exports
  │
  ├── constants/
  │ ├── index.ts
  │ ├── entity.ts # Entity type constants
  │ ├── sync.ts # Sync constants
  │ ├── storage.ts # Storage keys
  │ └── api.ts # API endpoints
  │
  ├── utils/
  │ ├── index.ts
  │ ├── logger.ts # Logging abstraction
  │ ├── date.ts # Date utilities
  │ ├── payload.ts # Payload helpers
  │ ├── network.ts # Network utilities
  │ └── validation.ts # Validation helpers
  │
  ├── hooks/
  │ ├── useAppDispatch.ts
  │ ├── useAppSelector.ts
  │ └── useSync.ts # Re-export from offline
  │
  └── store/
  └── store.ts # Redux store configuration
