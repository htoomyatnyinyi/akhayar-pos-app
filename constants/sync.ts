// constants/sync.ts
export const SYNC = {
  INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAX_RETRY_ATTEMPTS: 5,
  DEFAULT_MAX_ITEMS: 50,
  RETRY_DELAY: {
    BASE: 5,
    MAX: 300, // 5 minutes
  },
  PROGRESS: {
    START: 0,
    PRODUCTS: 10,
    SESSIONS: 20,
    FIX_SESSIONS: 30,
    ORDERS: 40,
    OTHERS: 60,
    COMPLETE: 80,
    FINISH: 100,
  },
} as const;

export const QUEUE = {
  BATCH_SIZE: 25,
  MAX_ITEMS: 1000,
  CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
} as const;
