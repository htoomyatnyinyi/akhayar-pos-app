import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { CartItem } from "./cartTypes";

interface CartState {
  items: CartItem[];
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
        existingItem.qty += 1;
      } else {
        state.items.push(action.payload);
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
  },
});

export const { addToCart, decreaseQty, removeFromCart, clearCart } =
  cartSlice.actions;

export default cartSlice.reducer;
