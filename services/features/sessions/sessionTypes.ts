export interface Session {
  id: string;
  userId: string;
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
}

export interface OpenSessionPayload {
  userId: string;
  openingBalance: number;
  notes?: string;
}

export interface CloseSessionPayload {
  closingBalance: number;
  notes?: string;
}
