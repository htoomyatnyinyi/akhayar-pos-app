// services/features/cart/cartSlice.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CartItem } from "./cartTypes";

interface CartState {
  items: CartItem[];
  lastCheckoutId?: string;
  lastCheckoutStatus?: "pending" | "synced" | "failed";
}

const initialState: CartState = {
  items: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id,
      );
      if (existingItem) {
        existingItem.qty += action.payload.qty || 1;
      } else {
        state.items.push({ ...action.payload, qty: action.payload.qty || 1 });
      }
    },

    // ✅ ADD THIS - For updating quantity directly
    updateQuantity: (
      state,
      action: PayloadAction<{ id: string; qty: number }>,
    ) => {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) {
        if (action.payload.qty <= 0) {
          state.items = state.items.filter((i) => i.id !== action.payload.id);
        } else {
          item.qty = action.payload.qty;
        }
      }
    },

    decreaseQty: (state, action: PayloadAction<string>) => {
      const item = state.items.find((i) => i.id === action.payload);
      if (!item) return;
      if (item.qty > 1) {
        item.qty -= 1;
      } else {
        state.items = state.items.filter((i) => i.id !== action.payload);
      }
    },

    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },

    clearCart: (state) => {
      state.items = [];
    },

    setCheckoutState: (
      state,
      action: PayloadAction<{
        checkoutId?: string;
        status?: "pending" | "synced" | "failed";
      }>,
    ) => {
      state.lastCheckoutId = action.payload.checkoutId;
      state.lastCheckoutStatus = action.payload.status;
    },
  },
});

export const {
  addToCart,
  decreaseQty,
  removeFromCart,
  clearCart,
  setCheckoutState,
  updateQuantity, // ✅ EXPORT THIS
} = cartSlice.actions;

export default cartSlice.reducer;

// import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// import { CartItem } from "./cartTypes";

// interface CartState {
//   items: CartItem[];
//   lastCheckoutId?: string;
//   lastCheckoutStatus?: "pending" | "synced" | "failed";
// }

// const initialState: CartState = {
//   items: [],
// };

// const cartSlice = createSlice({
//   name: "cart",

//   initialState,

//   reducers: {
//     addToCart: (state, action: PayloadAction<CartItem>) => {
//       const existingItem = state.items.find(
//         (item) => item.id === action.payload.id,
//       );

//       if (existingItem) {
//         existingItem.qty += 1;
//       } else {
//         state.items.push(action.payload);
//       }
//     },

//     decreaseQty: (state, action: PayloadAction<string>) => {
//       const item = state.items.find((i) => i.id === action.payload);

//       if (!item) return;

//       if (item.qty > 1) {
//         item.qty -= 1;
//       } else {
//         state.items = state.items.filter((i) => i.id !== action.payload);
//       }
//     },

//     removeFromCart: (state, action: PayloadAction<string>) => {
//       state.items = state.items.filter((item) => item.id !== action.payload);
//     },

//     clearCart: (state) => {
//       state.items = [];
//     },
//     setCheckoutState: (
//       state,
//       action: PayloadAction<{
//         checkoutId?: string;
//         status?: "pending" | "synced" | "failed";
//       }>,
//     ) => {
//       state.lastCheckoutId = action.payload.checkoutId;
//       state.lastCheckoutStatus = action.payload.status;
//     },
//   },
// });

// export const {
//   addToCart,
//   decreaseQty,
//   removeFromCart,
//   clearCart,
//   setCheckoutState,
// } = cartSlice.actions;

// export default cartSlice.reducer;
