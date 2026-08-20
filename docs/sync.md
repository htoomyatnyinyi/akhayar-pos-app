Implemented safe offline sync recovery.

Changes:

- Added per-item retry and discard controls in [sync.tsx](</Users/htoomyatnyinyi/Desktop/test_pos/akhayar_project/akhayar-pos-app/app/(tabs)/sync.tsx>).
- Added **Remove Failed** to clear only failed/dead queue entries while preserving cached products, orders, and inventory.
- Added confirmation before **Clear Outbox**.
- Added error handling for cleanup actions.
- Failed items become `dead` after 10 attempts and no longer block healthy sync items.
- Kept **Clear Offline Database** as a last-resort destructive action.
- Added operational guidance in [offline-sync-recovery.md](/Users/htoomyatnyinyi/Desktop/test_pos/akhayar_project/akhayar-pos-app/docs/offline-sync-recovery.md).
- Added repository functions in [repository.ts](/Users/htoomyatnyinyi/Desktop/test_pos/akhayar_project/akhayar-pos-app/services/offline/repository.ts).

Recommended workflow:

1. Retry network-related failures.
2. Fix permission, validation, 404, or duplicate errors, then retry.
3. Discard only permanently invalid changes.
4. Use **Remove Failed** after reviewing failures.
5. Use **Clear Offline Database** only when rebuilding local data from the server.

Validation completed: ESLint reports no errors; only existing warnings remain., explain in myanmar\
