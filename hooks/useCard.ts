import {
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  setCustomer,
  setNote,
} from "@/services/features/cart/cartSlice";
import { useAppDispatch, useAppSelector } from "@/services/store/hooks";

export function useCart() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.cart.items);
  const customerId = useAppSelector((state) => state.cart.customerId);
  const note = useAppSelector((state) => state.cart.note);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce(
    (sum, i) => sum + i.quantity * i.sellingPrice,
    0,
  );

  return {
    cart: items,
    totalItems,
    totalPrice,
    customerId,
    note,
    addToCart: (product: any) => dispatch(addItem({ ...product, quantity: 1 })),
    removeFromCart: (id: string) => dispatch(removeItem(id)),
    updateQuantity: (id: string, qty: number) =>
      dispatch(updateQuantity({ id, quantity: qty })),
    clearCart: () => dispatch(clearCart()),
    setCustomer: (id: string | null) => dispatch(setCustomer(id)),
    setNote: (note: string) => dispatch(setNote(note)),
  };
}
