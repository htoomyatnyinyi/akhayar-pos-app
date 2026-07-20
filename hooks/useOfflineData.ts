import { useEffect, useState } from "react";
import { OrderRepository } from "@/services/offline/repositories/orderRepo";
import { ProductRepository } from "@/services/offline/repositories/productRepo";
import { CustomerRepository } from "@/services/offline/repositories/customerRepo";

export function useOfflineOrders(storeId?: string, status?: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const repo = new OrderRepository();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const local = await repo.getOrders(storeId, status);
      setData(local);
      setLoading(false);
    };
    load();
  }, [storeId, status]);

  return { data, loading };
}

export function useOfflineProducts(storeId?: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const repo = new ProductRepository();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const local = await repo.getProducts(storeId);
      setData(local);
      setLoading(false);
    };
    load();
  }, [storeId]);

  return { data, loading };
}

export function useOfflineCustomers() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const repo = new CustomerRepository();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const local = await repo.getCustomers();
      setData(local);
      setLoading(false);
    };
    load();
  }, []);

  return { data, loading };
}
