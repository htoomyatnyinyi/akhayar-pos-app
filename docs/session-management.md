# Session Management and Cash Reconciliation

This document describes how a POS session is opened, checked, closed, synchronized, and printed.

## What a session contains

A session represents one register shift. It stores:

- Opening balance: cash already in the drawer when the shift starts.
- Orders: orders created while the session is open.
- Payment totals: cash, card, and digital sales.
- Closing balance: physical cash counted at the end of the shift.
- Expected balance: the cash that should be in the drawer.
- Discrepancy: extra or missing cash.

## Which orders are counted

Orders linked to the session are loaded by the sessionId field.

VOIDED and CANCELLED orders remain visible in the session report, but they are excluded from total sales, payment totals, expected cash, and discrepancy calculation.

All other orders are counted. If an order contains paymentBreakdown, each tender is added separately. Otherwise, the order paymentMethod and grandTotal are used.

## Cash calculation

At close time the app calculates:

    expected cash = opening balance + cash sales
    discrepancy   = counted closing cash - expected cash

Examples:

| Opening | Cash sales | Counted cash | Expected |     Difference |
| ------: | ---------: | -----------: | -------: | -------------: |
|  100.00 |     250.00 |       350.00 |   350.00 |           0.00 |
|  100.00 |     250.00 |       340.00 |   350.00 | -10.00 missing |
|  100.00 |     250.00 |       360.00 |   350.00 |   +10.00 extra |

Card and digital sales are recorded separately and do not increase expected drawer cash.

## Closing a session in the app

1. Open Sessions and select the active session's Close button.
2. Review the displayed cash sales, expected cash, and difference.
3. Count the physical cash and enter it as Closing Balance.
4. Add an optional closing note.
5. Confirm Close Session.

The close request stores closingBalance, expectedBalance, discrepancy, cashSales, cardSales, and digitalSales.

## Close-session printout

After a successful close, the app opens the system print dialog with a session report containing:

- Session number and opening time
- Number of related orders
- Counted sales total
- Cash/card/digital payment totals
- Every related order, including voided/cancelled orders for audit visibility
- Order items when item details are available

If printing fails, the session remains closed and the app displays an error explaining that only printing failed.

## Offline and synchronization behavior

Sessions and orders are stored locally first. When the server is available, remote sessions are merged using remoteId while preserving the local session ID used by local orders.

When an offline session is closed, its queued sync operation resolves the server session ID before calling the close endpoint. This prevents a local ID from being sent to the server and avoids 404 or mismatched-session errors.

## Troubleshooting missing orders

If an order is absent from the session total or report, verify:

1. The order has the same sessionId as the session.
2. The order belongs to the selected store.
3. The order is not still pending synchronization.
4. The order status is not VOIDED or CANCELLED if checking financial totals.
5. The app has refreshed local data after reconnecting to the server.

For a missing amount, compare the printed payment totals with the drawer count. Only cash sales plus the opening balance should be compared with physical cash.

## Relevant implementation files

- app/(tabs)/sessions.tsx — session screen, reconciliation preview, close action, and report printing.
- services/features/offline/localApi.ts — local session/order queries and mutations.
- services/offline/repository.ts — local persistence, session/order linking, and outbox creation.
- services/offline/syncManager.ts — queued session synchronization and remote ID resolution.
- ../pos_server/src/routes/sessions.ts — server-side session close validation and persistence.
