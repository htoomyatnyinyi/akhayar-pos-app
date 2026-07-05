// ============================================
// FILE: services/features/sessions/sessionTypes.ts
// ============================================

import { User } from "../auth/authTypes";
import { Order } from "../order/orderTypes";

export interface Session {
  remoteId: any;
  id: string;
  tenantId: string;
  storeId?: string;
  registerId?: string;
  userId: string;
  user?: User;
  status: "OPEN" | "CLOSED" | "SUSPENDED";
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  discrepancy?: number;
  cashSales: number;
  cardSales: number;
  digitalSales: number;
  notes?: string;
  orders?: Order[];
  createdAt: string;
  updatedAt: string;
}

export interface OpenSessionPayload {
  userId: string;
  openingBalance: number;
  storeId?: string;
  registerId?: string;
  notes?: string;
}

export interface CloseSessionPayload {
  closingBalance: number;
  expectedBalance: number;
  discrepancy: number;
  cashSales?: number;
  cardSales?: number;
  digitalSales?: number;
  notes?: string;
}

// // services/features/sessions/sessionTypes.ts
// export interface Session {
//   tenantId: any;
//   id: string;
//   userId: string;
//   storeId?: string;
//   registerId?: string;
//   status: "OPEN" | "CLOSED" | "SUSPENDED";
//   openedAt: string;
//   closedAt?: string;
//   openingBalance: number;
//   closingBalance?: number;
//   expectedBalance?: number;
//   discrepancy?: number;
//   cashSales: number;
//   cardSales: number;
//   digitalSales: number;
//   notes?: string;
// }

// export interface OpenSessionPayload {
//   userId: string;
//   openingBalance: number;
//   storeId?: string;
//   registerId?: string;
//   notes?: string;
// }

// export interface CloseSessionPayload {
//   closingBalance: number;
//   expectedBalance?: number;
//   discrepancy?: number;
//   cashSales?: number;
//   cardSales?: number;
//   digitalSales?: number;
//   notes?: string;
// }

// // export interface Session {
// //   tenantId: any;
// //   storeId: any;
// //   registerId: any;
// //   id: string;
// //   userId: string;
// //   status: "OPEN" | "CLOSED" | "SUSPENDED";
// //   openedAt: string;
// //   closedAt?: string;
// //   openingBalance: number;
// //   closingBalance?: number;
// //   expectedBalance?: number;
// //   discrepancy?: number;
// //   cashSales: number;
// //   cardSales: number;
// //   digitalSales: number;
// //   notes?: string;
// // }

// // export interface OpenSessionPayload {
// //   userId: string;
// //   openingBalance: number;
// //   notes?: string;
// // }

// // export interface CloseSessionPayload {
// //   expectedBalance:
// //     | number
// //     | SQL<unknown>
// //     | SQLiteColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}>
// //     | null
// //     | undefined;
// //   discrepancy:
// //     | number
// //     | SQL<unknown>
// //     | SQLiteColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}>
// //     | null
// //     | undefined;
// //   cashSales: number;
// //   cardSales: number;
// //   digitalSales: number;
// //   closingBalance: number;
// //   notes?: string;
// // }
