app/
├── \_layout.tsx # Root layout (Redux, sync init)
├── (auth)/
│ ├── \_layout.tsx # Auth stack (no header)
│ ├── login.tsx
│ └── register.tsx
├── (pos)/
│ ├── \_layout.tsx # Main POS tabs
│ ├── index.tsx # POS Home (product grid + cart)
│ ├── cart.tsx # Cart detail (optional, but can be bottom sheet)
│ ├── checkout.tsx # Checkout / Payment screen
│ ├── orders/
│ │ ├── \_layout.tsx
│ │ └── index.tsx # Order list
│ ├── inventory/
│ │ ├── \_layout.tsx
│ │ └── index.tsx # Stock list, transfers, counts
│ ├── customers/
│ │ ├── \_layout.tsx
│ │ └── index.tsx # Customer list
│ └── more/
│ ├── \_layout.tsx
│ ├── settings.tsx # Store settings, printer, etc.
│ └── sync.tsx # Manual sync, status
├── components/
│ ├── ui/ # Shared UI (Button, Input, Card, etc.)
│ ├── pos/ # POS specific components
│ │ ├── ProductCard.tsx
│ │ ├── CategoryPills.tsx
│ │ └── CartBottomSheet.tsx
│ ├── orders/
│ │ └── OrderCard.tsx
│ └── layout/
│ ├── Header.tsx
│ └── BottomTab.tsx
├── services/
│ ├── api/
│ │ └── baseApi.ts # RTK Query base (with token)
│ ├── offline/
│ │ ├── db.ts # Drizzle client
│ │ ├── schema.ts # SQLite tables
│ │ ├── repositories/ # ProductRepo, OrderRepo, etc.
│ │ └── migrations/ # Drizzle migrations
│ └── secureStorage.ts # expo-secure-store wrappers
├── features/
│ ├── auth/
│ ├── orders/
│ ├── products/
│ ├── inventory/
│ ├── customers/
│ └── sync/
├── hooks/
│ ├── useNetworkStatus.ts
│ ├── useCart.ts # Manage cart state
│ └── useOfflineData.ts
├── store/
│ ├── index.ts # Redux store
│ └── slices/ # authSlice, syncSlice, cartSlice
├── theme/
│ ├── colors.ts
│ └── typography.ts
└── utils/
├── helpers.ts
└── conflictResolver.ts
