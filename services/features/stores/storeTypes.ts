// // ============================================
// // FILE: services/features/stores/storeTypes.ts
// // ============================================

// import { Inventory } from "../inventory/inventoryTypes";
// import { Order } from "../order/orderTypes";
// import { Session } from "../sessions/sessionTypes";

// export interface Store {
//   remoteId: any;
//   id: string;
//   tenantId: string;
//   code: string;
//   name: string;
//   address?: string;
//   phone?: string;
//   email?: string;
//   taxNumber?: string;
//   isActive: boolean;
//   inventory?: Inventory[];
//   orders?: Order[];
//   sessions?: Session[];
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateStorePayload {
//   tenantId: string;
//   code?: string;
//   name: string;
//   address?: string;
//   phone?: string;
//   email?: string;
//   taxNumber?: string;
//   isActive?: boolean;
// }

// export interface UpdateStorePayload extends Partial<CreateStorePayload> {
//   id: string;
// }

// // // services/features/stores/storeTypes.ts
// // export interface Store {
// //   remoteId: any;
// //   id: string;
// //   code: string;
// //   name: string;
// //   address?: string;
// //   phone?: string;
// //   email?: string;
// //   taxNumber?: string;
// //   tenantId?: string;
// //   isActive: boolean;
// //   createdAt: string;
// //   updatedAt: string;
// // }

// // export interface CreateStorePayload {
// //   code?: string;
// //   name: string;
// //   address?: string;
// //   phone?: string;
// //   email?: string;
// //   taxNumber?: string;
// //   isActive?: boolean;
// // }

// // // export interface Store {
// // //   tenantId: any;
// // //   id: string;
// // //   code: string;
// // //   name: string;
// // //   address?: string;
// // //   phone?: string;
// // //   email?: string;
// // //   taxNumber?: string;
// // //   isActive: boolean;
// // //   createdAt: string;
// // //   updatedAt: string;
// // // }

// // // export interface CreateStorePayload {
// // //   code?: string;
// // //   name: string;
// // //   address?: string;
// // //   phone?: string;
// // //   email?: string;
// // //   taxNumber?: string;
// // //   isActive?: boolean;
// // // }
// // // //
