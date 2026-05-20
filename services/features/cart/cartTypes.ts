export interface CartItem {
  id: string; // Changed from number to string (Product cuid)
  name: string;
  price: number;
  qty: number;
  image?: string;
}
