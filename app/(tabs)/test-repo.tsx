// app/dev/test-repository.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  ScrollView,
  SafeAreaView,
  TextInput,
  Pressable,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  // Products
  getLocalProducts,
  createOfflineProduct,
  updateOfflineProduct,
  deleteOfflineProduct,
  getLocalProductByBarcode,
  upsertProducts,

  // Categories
  getLocalCategories,
  createOfflineCategory,
  updateOfflineCategory,
  deleteOfflineCategory,
  upsertCategories,

  // Customers
  getLocalCustomers,
  createOfflineCustomer,
  updateOfflineCustomer,
  deleteOfflineCustomer,
  upsertCustomers,

  // Stores
  getLocalStores,
  createOfflineStore,
  updateOfflineStore,
  deleteOfflineStore,
  upsertStores,

  // Sessions
  getLocalActiveSession,
  openOfflineSession,
  closeOfflineSession,
  upsertSessions,

  // Orders
  getLocalOrders,
  getLocalOrderById,
  createOfflineOrder,
  updateOfflineOrderStatus,
  deleteOfflineOrder,
  upsertOrders,

  // Inventory
  getLocalInventory,
  createOfflineInventoryMovement,
  createOfflineInventoryCount,

  // Sync
  getDueOutboxItems,
  getOutboxItems,
  getFailedOutboxItems,
  getQueuedCount,
  retryOutboxItem,
  markOutboxSynced,
  markOutboxFailed,
  markOutboxDead,

  // Generic Records
  getLocalGenericRecords,
  createOfflineGenericRecord,
  updateOfflineGenericRecord,
  deleteOfflineGenericRecord,
  upsertGenericRecords,

  // Sync Status
  markEntitySynced,
  markEntitySyncFailed,
  markOrderSynced,
  markOrderSyncFailed,
} from "@/services/offline/repository";

type TestSection =
  | "products"
  | "categories"
  | "customers"
  | "stores"
  | "sessions"
  | "orders"
  | "inventory"
  | "sync"
  | "generic";

export default function TestRepositoryScreen() {
  const [activeSection, setActiveSection] = useState<TestSection>("products");
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [outboxItems, setOutboxItems] = useState<any[]>([]);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [sessionData, setSessionData] = useState<any>(null);
  const [genericRecords, setGenericRecords] = useState<any[]>([]);

  // Form states
  const [productName, setProductName] = useState("");
  const [productSku, setProductSku] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productStock, setProductStock] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [genericEntity, setGenericEntity] = useState("");
  const [genericData, setGenericData] = useState("");

  const addLog = (
    message: string,
    type: "info" | "success" | "error" | "warning" = "info",
  ) => {
    const emojis = {
      info: "ℹ️",
      success: "✅",
      error: "❌",
      warning: "⚠️",
    };
    setLogs((prev) => [
      `${emojis[type]} ${new Date().toLocaleTimeString()} - ${message}`,
      ...prev,
    ]);
  };

  const clearLogs = () => setLogs([]);

  // ==================== PRODUCT TESTS ====================

  const testCreateProduct = async () => {
    try {
      setIsLoading(true);
      const name = productName || `Test Product ${Date.now()}`;
      const sku = productSku || `TEST-${Date.now()}`;
      const price = parseFloat(productPrice) || 100;
      const stock = parseInt(productStock) || 10;

      addLog(`Creating product: ${name}`, "info");
      const product = await createOfflineProduct({
        name,
        sku,
        sellingPrice: price,
        costPrice: price * 0.5,
        stockQuantity: stock,
        storeId: "store-123",
        description: "Test product created from repository test",
        brand: "Test Brand",
        categoryName: "Test Category",
      });
      addLog(
        `Product created: ${product.id} - ${product.name} (SKU: ${product.sku})`,
        "success",
      );
      await testGetProducts();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
      Alert.alert("Error", error.message || "Failed to create product");
    } finally {
      setIsLoading(false);
    }
  };

  const testGetProducts = async () => {
    try {
      setIsLoading(true);
      addLog("Fetching products...", "info");
      const items = await getLocalProducts();
      setProducts(items);
      addLog(`Found ${items.length} products`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testGetProductByBarcode = async () => {
    try {
      setIsLoading(true);
      // Get first product to get its barcode
      const items = await getLocalProducts();
      if (items.length === 0) {
        addLog("No products to test barcode search", "warning");
        return;
      }

      const barcode = items[0].barcode || "1234567890";
      addLog(`Fetching product by barcode: ${barcode}`, "info");
      const product = await getLocalProductByBarcode(barcode);
      if (product) {
        addLog(`Found: ${product.name} (${product.id})`, "success");
      } else {
        addLog("No product found with this barcode", "warning");
      }
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateProduct = async () => {
    try {
      setIsLoading(true);
      const items = await getLocalProducts();
      if (items.length === 0) {
        addLog("No products to update", "warning");
        return;
      }

      const product = items[0];
      const newName = `Updated ${Date.now()}`;
      addLog(`Updating product: ${product.id} - ${product.name}`, "info");

      const updated = await updateOfflineProduct(product.id, {
        name: newName,
        sellingPrice: 250,
        stockQuantity: 50,
        description: "Updated by test",
      });

      addLog(
        `Product updated: ${updated.name} - $${updated.sellingPrice}`,
        "success",
      );
      await testGetProducts();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteProduct = async () => {
    try {
      setIsLoading(true);
      const items = await getLocalProducts();
      if (items.length === 0) {
        addLog("No products to delete", "warning");
        return;
      }

      const product = items[0];
      addLog(`Deleting product: ${product.id} - ${product.name}`, "warning");

      await deleteOfflineProduct(product.id);
      addLog(`Product deleted successfully`, "success");
      await testGetProducts();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testUpsertProducts = async () => {
    try {
      setIsLoading(true);
      const remoteProducts: any[] = [
        {
          id: `remote-${Date.now()}`,
          name: "Remote Product 1",
          sku: `REMOTE-${Date.now()}`,
          sellingPrice: 150,
          costPrice: 75,
          stockQuantity: 20,
          storeId: "store-123",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `remote-${Date.now() + 1}`,
          name: "Remote Product 2",
          sku: `REMOTE-${Date.now() + 1}`,
          sellingPrice: 200,
          costPrice: 100,
          stockQuantity: 15,
          storeId: "store-123",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      addLog(`Upserting ${remoteProducts.length} products...`, "info");
      await upsertProducts(remoteProducts);
      addLog(`Products upserted successfully`, "success");
      await testGetProducts();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== CATEGORY TESTS ====================

  const testCreateCategory = async () => {
    try {
      setIsLoading(true);
      const name = categoryName || `Test Category ${Date.now()}`;
      addLog(`Creating category: ${name}`, "info");

      const category = await createOfflineCategory({
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        description: "Test category",
        storeId: "store-123",
      });

      addLog(`Category created: ${category.id} - ${category.name}`, "success");
      await testGetCategories();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testGetCategories = async () => {
    try {
      setIsLoading(true);
      addLog("Fetching categories...", "info");
      const items = await getLocalCategories("store-123");
      setCategories(items);
      addLog(`Found ${items.length} categories`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateCategory = async () => {
    try {
      setIsLoading(true);
      const items = await getLocalCategories("store-123");
      if (items.length === 0) {
        addLog("No categories to update", "warning");
        return;
      }

      const category = items[0];
      const newName = `Updated ${Date.now()}`;
      addLog(`Updating category: ${category.id} - ${category.name}`, "info");

      await updateOfflineCategory(category.id, {
        name: newName,
        description: "Updated by test",
      });

      addLog(`Category updated successfully`, "success");
      await testGetCategories();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteCategory = async () => {
    try {
      setIsLoading(true);
      const items = await getLocalCategories("store-123");
      if (items.length === 0) {
        addLog("No categories to delete", "warning");
        return;
      }

      const category = items[0];
      addLog(`Deleting category: ${category.id} - ${category.name}`, "warning");

      await deleteOfflineCategory(category.id);
      addLog(`Category deleted successfully`, "success");
      await testGetCategories();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testUpsertCategories = async () => {
    try {
      setIsLoading(true);
      const remoteCategories: any[] = [
        {
          id: `cat-${Date.now()}`,
          name: "Remote Category 1",
          slug: "remote-category-1",
          description: "Remote category 1",
          storeId: "store-123",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `cat-${Date.now() + 1}`,
          name: "Remote Category 2",
          slug: "remote-category-2",
          description: "Remote category 2",
          storeId: "store-123",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      addLog(`Upserting ${remoteCategories.length} categories...`, "info");
      await upsertCategories(remoteCategories);
      addLog(`Categories upserted successfully`, "success");
      await testGetCategories();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== CUSTOMER TESTS ====================

  const testCreateCustomer = async () => {
    try {
      setIsLoading(true);
      const name = customerName || `Test Customer ${Date.now()}`;
      addLog(`Creating customer: ${name}`, "info");

      const customer = await createOfflineCustomer({
        name,
        phone: `09${Math.floor(Math.random() * 100000000)}`,
        email: `test${Date.now()}@example.com`,
        address: "Test Address",
      });

      addLog(`Customer created: ${customer.id} - ${customer.name}`, "success");
      await testGetCustomers();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testGetCustomers = async () => {
    try {
      setIsLoading(true);
      addLog("Fetching customers...", "info");
      const items = await getLocalCustomers();
      setCustomers(items);
      addLog(`Found ${items.length} customers`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateCustomer = async () => {
    try {
      setIsLoading(true);
      const items = await getLocalCustomers();
      if (items.length === 0) {
        addLog("No customers to update", "warning");
        return;
      }

      const customer = items[0];
      addLog(`Updating customer: ${customer.id} - ${customer.name}`, "info");

      await updateOfflineCustomer(customer.id, {
        name: `Updated ${Date.now()}`,
        phone: `09${Math.floor(Math.random() * 100000000)}`,
      });

      addLog(`Customer updated successfully`, "success");
      await testGetCustomers();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteCustomer = async () => {
    try {
      setIsLoading(true);
      const items = await getLocalCustomers();
      if (items.length === 0) {
        addLog("No customers to delete", "warning");
        return;
      }

      const customer = items[0];
      addLog(`Deleting customer: ${customer.id} - ${customer.name}`, "warning");

      await deleteOfflineCustomer(customer.id);
      addLog(`Customer deleted successfully`, "success");
      await testGetCustomers();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testUpsertCustomers = async () => {
    try {
      setIsLoading(true);
      const remoteCustomers: any[] = [
        {
          id: `cust-${Date.now()}`,
          code: `CUST-${Date.now()}`,
          name: "Remote Customer 1",
          phone: "09123456789",
          email: "remote1@example.com",
          tier: "GOLD",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `cust-${Date.now() + 1}`,
          code: `CUST-${Date.now() + 1}`,
          name: "Remote Customer 2",
          phone: "09123456790",
          email: "remote2@example.com",
          tier: "SILVER",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      addLog(`Upserting ${remoteCustomers.length} customers...`, "info");
      await upsertCustomers(remoteCustomers);
      addLog(`Customers upserted successfully`, "success");
      await testGetCustomers();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== STORE TESTS ====================

  const testCreateStore = async () => {
    try {
      setIsLoading(true);
      const name = storeName || `Test Store ${Date.now()}`;
      addLog(`Creating store: ${name}`, "info");

      const store = await createOfflineStore({
        name,
        code: `STORE-${Date.now()}`,
        address: "Test Address",
        phone: "09123456789",
        email: `store${Date.now()}@example.com`,
      });

      addLog(`Store created: ${store.id} - ${store.name}`, "success");
      await testGetStores();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testGetStores = async () => {
    try {
      setIsLoading(true);
      addLog("Fetching stores...", "info");
      const items = await getLocalStores();
      setStores(items);
      addLog(`Found ${items.length} stores`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateStore = async () => {
    try {
      setIsLoading(true);
      const items = await getLocalStores();
      if (items.length === 0) {
        addLog("No stores to update", "warning");
        return;
      }

      const store = items[0];
      addLog(`Updating store: ${store.id} - ${store.name}`, "info");

      await updateOfflineStore(store.id, {
        name: `Updated ${Date.now()}`,
        address: "Updated Address",
      });

      addLog(`Store updated successfully`, "success");
      await testGetStores();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteStore = async () => {
    try {
      setIsLoading(true);
      const items = await getLocalStores();
      if (items.length === 0) {
        addLog("No stores to delete", "warning");
        return;
      }

      const store = items[0];
      addLog(`Deleting store: ${store.id} - ${store.name}`, "warning");

      await deleteOfflineStore(store.id);
      addLog(`Store deleted successfully`, "success");
      await testGetStores();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testUpsertStores = async () => {
    try {
      setIsLoading(true);
      const remoteStores: any[] = [
        {
          id: `store-${Date.now()}`,
          code: `REMOTE-${Date.now()}`,
          name: "Remote Store 1",
          address: "Remote Address 1",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `store-${Date.now() + 1}`,
          code: `REMOTE-${Date.now() + 1}`,
          name: "Remote Store 2",
          address: "Remote Address 2",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      addLog(`Upserting ${remoteStores.length} stores...`, "info");
      await upsertStores(remoteStores);
      addLog(`Stores upserted successfully`, "success");
      await testGetStores();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== SESSION TESTS ====================

  const testOpenSession = async () => {
    try {
      setIsLoading(true);
      addLog("Opening session...", "info");

      const session = await openOfflineSession({
        userId: "test-user-123",
        openingBalance: 1000,
        notes: "Test session opened",
        storeId: "store-123",
      });

      addLog(`Session opened: ${session.id}`, "success");
      await testGetActiveSession();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testGetActiveSession = async () => {
    try {
      setIsLoading(true);
      addLog("Fetching active session...", "info");
      const session = await getLocalActiveSession("test-user-123", "store-123");
      setSessionData(session);
      if (session) {
        addLog(
          `Active session found: ${session.id} - Status: ${session.status}`,
          "success",
        );
      } else {
        addLog("No active session found", "warning");
      }
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testCloseSession = async () => {
    try {
      setIsLoading(true);
      const session = await getLocalActiveSession("test-user-123", "store-123");
      if (!session) {
        addLog("No active session to close", "warning");
        return;
      }

      addLog(`Closing session: ${session.id}`, "info");

      await closeOfflineSession(session.id, {
        closingBalance: 1500,
        notes: "Test session closed",
      });

      addLog(`Session closed successfully`, "success");
      await testGetActiveSession();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testUpsertSessions = async () => {
    try {
      setIsLoading(true);
      const remoteSessions: any[] = [
        {
          id: `session-${Date.now()}`,
          userId: "remote-user-1",
          status: "CLOSED",
          openedAt: new Date().toISOString(),
          closedAt: new Date().toISOString(),
          openingBalance: 1000,
          closingBalance: 1200,
          cashSales: 200,
          cardSales: 0,
          digitalSales: 0,
          notes: "Remote session",
        },
      ];

      addLog(`Upserting ${remoteSessions.length} sessions...`, "info");
      await upsertSessions(remoteSessions);
      addLog(`Sessions upserted successfully`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== ORDER TESTS ====================

  const testCreateOrder = async () => {
    try {
      setIsLoading(true);
      const products = await getLocalProducts();
      if (products.length === 0) {
        addLog("No products available to create order", "warning");
        return;
      }

      const product = products[0];
      const session = await getLocalActiveSession("test-user-123", "store-123");

      addLog("Creating order...", "info");

      const order = await createOfflineOrder({
        userId: "test-user-123",
        storeId: "store-123",
        sessionId: session?.id,
        customerId: undefined,
        items: [
          {
            productId: product.id,
            quantity: 2,
            unitPrice: product.sellingPrice || 100,
            subTotal: (product.sellingPrice || 100) * 2,
            discountAmount: 0,
          },
        ],
        subTotal: (product.sellingPrice || 100) * 2,
        taxAmount: 0,
        discountAmount: 0,
        grandTotal: (product.sellingPrice || 100) * 2,
        paidAmount: (product.sellingPrice || 100) * 2,
        changeAmount: 0,
        paymentMethod: "CASH",
        paymentStatus: "PAID",
        paymentBreakdown: [
          { method: "CASH", amount: (product.sellingPrice || 100) * 2 },
        ],
      });

      addLog(
        `Order created: ${order.id} - Total: $${order.grandTotal}`,
        "success",
      );
      await testGetOrders();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testGetOrders = async () => {
    try {
      setIsLoading(true);
      addLog("Fetching orders...", "info");
      const items = await getLocalOrders("store-123");
      setOrders(items);
      addLog(`Found ${items.length} orders`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testGetOrderById = async () => {
    try {
      setIsLoading(true);
      const items = await getLocalOrders("store-123");
      if (items.length === 0) {
        addLog("No orders to fetch", "warning");
        return;
      }

      const order = items[0];
      addLog(`Fetching order by ID: ${order.id}`, "info");
      const found = await getLocalOrderById(order.id);

      if (found) {
        addLog(
          `Order found: ${found.id} - Total: $${found.grandTotal}`,
          "success",
        );
      } else {
        addLog("Order not found", "warning");
      }
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateOrderStatus = async () => {
    try {
      setIsLoading(true);
      const items = await getLocalOrders("store-123");
      if (items.length === 0) {
        addLog("No orders to update", "warning");
        return;
      }

      const order = items[0];
      const newStatus = order.status === "COMPLETED" ? "PENDING" : "COMPLETED";
      addLog(`Updating order ${order.id} status to ${newStatus}`, "info");

      await updateOfflineOrderStatus(order.id, newStatus);
      addLog(`Order status updated to ${newStatus}`, "success");
      await testGetOrders();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteOrder = async () => {
    try {
      setIsLoading(true);
      const items = await getLocalOrders("store-123");
      if (items.length === 0) {
        addLog("No orders to delete", "warning");
        return;
      }

      const order = items[0];
      addLog(`Voiding order: ${order.id}`, "warning");

      await deleteOfflineOrder(order.id);
      addLog(`Order voided successfully`, "success");
      await testGetOrders();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testUpsertOrders = async () => {
    try {
      setIsLoading(true);
      const remoteOrders: any[] = [
        {
          id: `order-${Date.now()}`,
          storeId: "store-123",
          userId: "remote-user",
          status: "COMPLETED",
          grandTotal: 500,
          subTotal: 500,
          paidAmount: 500,
          changeAmount: 0,
          paymentMethod: "CASH",
          paymentStatus: "PAID",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: [
            {
              id: `item-${Date.now()}`,
              productId: "remote-product-1",
              productName: "Remote Product",
              quantity: 5,
              unitPrice: 100,
              subTotal: 500,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ];

      addLog(`Upserting ${remoteOrders.length} orders...`, "info");
      await upsertOrders(remoteOrders);
      addLog(`Orders upserted successfully`, "success");
      await testGetOrders();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== INVENTORY TESTS ====================

  const testGetInventory = async () => {
    try {
      setIsLoading(true);
      addLog("Fetching inventory...", "info");
      const items = await getLocalInventory("store-123");
      setInventory(items);
      addLog(`Found ${items.length} inventory items`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateInventoryMovement = async () => {
    try {
      setIsLoading(true);
      const products = await getLocalProducts();
      if (products.length === 0) {
        addLog("No products available for inventory movement", "warning");
        return;
      }

      const product = products[0];
      addLog(`Creating inventory movement for product: ${product.id}`, "info");

      await createOfflineInventoryMovement({
        productId: product.id,
        storeId: "store-123",
        quantity: 10,
        type: "IN",
        referenceId: "ref-001",
        referenceType: "PURCHASE",
        reason: "Test inventory movement",
      });

      addLog(`Inventory movement created`, "success");
      await testGetInventory();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateInventoryCount = async () => {
    try {
      setIsLoading(true);
      const products = await getLocalProducts();
      if (products.length === 0) {
        addLog("No products available for inventory count", "warning");
        return;
      }

      const product = products[0];
      addLog(`Creating inventory count for product: ${product.id}`, "info");

      await createOfflineInventoryCount({
        storeId: "store-123",
        scheduledDate: new Date().toISOString(),
        items: [
          {
            productId: product.id,
            systemQuantity: product.stockQuantity || 0,
            countedQuantity: (product.stockQuantity || 0) + 5,
            reason: "Test count adjustment",
          },
        ],
      });

      addLog(`Inventory count created`, "success");
      await testGetInventory();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== SYNC TESTS ====================

  const testGetOutboxItems = async () => {
    try {
      setIsLoading(true);
      addLog("Fetching outbox items...", "info");
      const items = await getOutboxItems();
      setOutboxItems(items);
      const count = await getQueuedCount();
      setQueuedCount(count);
      addLog(
        `Found ${items.length} outbox items (${count} pending)`,
        "success",
      );
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testGetDueOutboxItems = async () => {
    try {
      setIsLoading(true);
      addLog("Fetching due outbox items...", "info");
      const items = await getDueOutboxItems();
      addLog(`Found ${items.length} due outbox items`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testGetFailedOutboxItems = async () => {
    try {
      setIsLoading(true);
      addLog("Fetching failed outbox items...", "info");
      const items = await getFailedOutboxItems();
      addLog(`Found ${items.length} failed outbox items`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testRetryOutboxItem = async () => {
    try {
      setIsLoading(true);
      const items = await getFailedOutboxItems();
      if (items.length === 0) {
        addLog("No failed outbox items to retry", "warning");
        return;
      }

      const item = items[0];
      addLog(`Retrying outbox item: ${item.id}`, "info");
      await retryOutboxItem(item.id);
      addLog(`Outbox item retried`, "success");
      await testGetOutboxItems();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testMarkOutboxSynced = async () => {
    try {
      setIsLoading(true);
      const items = await getOutboxItems();
      if (items.length === 0) {
        addLog("No outbox items to mark synced", "warning");
        return;
      }

      const item = items[0];
      addLog(`Marking outbox item as synced: ${item.id}`, "info");
      await markOutboxSynced(item.id);
      addLog(`Outbox item marked as synced`, "success");
      await testGetOutboxItems();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testMarkOutboxFailed = async () => {
    try {
      setIsLoading(true);
      const items = await getOutboxItems();
      if (items.length === 0) {
        addLog("No outbox items to mark failed", "warning");
        return;
      }

      const item = items[0];
      addLog(`Marking outbox item as failed: ${item.id}`, "info");
      await markOutboxFailed(item.id, 1, "Test error");
      addLog(`Outbox item marked as failed`, "success");
      await testGetOutboxItems();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testMarkOutboxDead = async () => {
    try {
      setIsLoading(true);
      const items = await getFailedOutboxItems();
      if (items.length === 0) {
        addLog("No failed outbox items to mark dead", "warning");
        return;
      }

      const item = items[0];
      addLog(`Marking outbox item as dead: ${item.id}`, "warning");
      await markOutboxDead(item.id);
      addLog(`Outbox item marked as dead`, "success");
      await testGetOutboxItems();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== GENERIC RECORD TESTS ====================

  const testCreateGenericRecord = async () => {
    try {
      setIsLoading(true);
      const entity = genericEntity || `test_${Date.now()}`;
      const data = genericData
        ? JSON.parse(genericData)
        : { name: `Test ${Date.now()}`, value: 123 };

      addLog(`Creating generic record: ${entity}`, "info");

      const record = await createOfflineGenericRecord(
        entity,
        `/api/${entity}`,
        data,
      );

      addLog(`Generic record created: ${record.id}`, "success");
      await testGetGenericRecords();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testGetGenericRecords = async () => {
    try {
      setIsLoading(true);
      const entity = genericEntity || "test";
      addLog(`Fetching generic records for: ${entity}`, "info");
      const items = await getLocalGenericRecords(entity);
      setGenericRecords(items);
      addLog(`Found ${items.length} generic records`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateGenericRecord = async () => {
    try {
      setIsLoading(true);
      const entity = genericEntity || "test";
      const items = await getLocalGenericRecords(entity);
      if (items.length === 0) {
        addLog("No generic records to update", "warning");
        return;
      }

      const record = items[0];
      addLog(`Updating generic record: ${record.id}`, "info");

      await updateOfflineGenericRecord(
        entity,
        `/api/${entity}/${record.id}`,
        record.id,
        { ...record, updated: true, value: 456 },
      );

      addLog(`Generic record updated`, "success");
      await testGetGenericRecords();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteGenericRecord = async () => {
    try {
      setIsLoading(true);
      const entity = genericEntity || "test";
      const items = await getLocalGenericRecords(entity);
      if (items.length === 0) {
        addLog("No generic records to delete", "warning");
        return;
      }

      const record = items[0];
      addLog(`Deleting generic record: ${record.id}`, "warning");

      await deleteOfflineGenericRecord(
        entity,
        `/api/${entity}/${record.id}`,
        record.id,
      );

      addLog(`Generic record deleted`, "success");
      await testGetGenericRecords();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testUpsertGenericRecords = async () => {
    try {
      setIsLoading(true);
      const entity = genericEntity || "test";
      const records = [
        { id: `gen-${Date.now()}`, name: "Generic 1", value: 100 },
        { id: `gen-${Date.now() + 1}`, name: "Generic 2", value: 200 },
      ];

      addLog(`Upserting ${records.length} generic records`, "info");
      await upsertGenericRecords(entity, records);
      addLog(`Generic records upserted`, "success");
      await testGetGenericRecords();
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== SYNC STATUS TESTS ====================

  const testMarkEntitySynced = async () => {
    try {
      setIsLoading(true);
      const products = await getLocalProducts();
      if (products.length === 0) {
        addLog("No products to mark synced", "warning");
        return;
      }

      const product = products[0];
      addLog(`Marking product ${product.id} as synced`, "info");
      await markEntitySynced("products", product.id, {
        id: `remote-${product.id}`,
      });
      addLog(`Product marked as synced`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testMarkEntitySyncFailed = async () => {
    try {
      setIsLoading(true);
      const products = await getLocalProducts();
      if (products.length === 0) {
        addLog("No products to mark sync failed", "warning");
        return;
      }

      const product = products[0];
      addLog(`Marking product ${product.id} as sync failed`, "warning");
      await markEntitySyncFailed("products", product.id, "Test sync failure");
      addLog(`Product marked as sync failed`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testMarkOrderSynced = async () => {
    try {
      setIsLoading(true);
      const orders = await getLocalOrders("store-123");
      if (orders.length === 0) {
        addLog("No orders to mark synced", "warning");
        return;
      }

      const order = orders[0];
      addLog(`Marking order ${order.id} as synced`, "info");
      await markOrderSynced(order.id, {
        id: `remote-${order.id}`,
        status: "COMPLETED",
        grandTotal: 0,
        items: [],
        createdAt: "",
      });
      addLog(`Order marked as synced`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testMarkOrderSyncFailed = async () => {
    try {
      setIsLoading(true);
      const orders = await getLocalOrders("store-123");
      if (orders.length === 0) {
        addLog("No orders to mark sync failed", "warning");
        return;
      }

      const order = orders[0];
      addLog(`Marking order ${order.id} as sync failed`, "warning");
      await markOrderSyncFailed(order.id, "Test order sync failure");
      addLog(`Order marked as sync failed`, "success");
    } catch (error: any) {
      addLog(`Error: ${error.message || error}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== RENDER ====================

  const renderSectionButtons = () => {
    const sections: { key: TestSection; label: string; color: string }[] = [
      { key: "products", label: "📦 Products", color: "blue" },
      { key: "categories", label: "📂 Categories", color: "green" },
      { key: "customers", label: "👤 Customers", color: "purple" },
      { key: "stores", label: "🏪 Stores", color: "orange" },
      { key: "sessions", label: "🔐 Sessions", color: "yellow" },
      { key: "orders", label: "📋 Orders", color: "red" },
      { key: "inventory", label: "📊 Inventory", color: "teal" },
      { key: "sync", label: "🔄 Sync", color: "pink" },
      { key: "generic", label: "📝 Generic", color: "gray" },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
        contentContainerStyle={{ paddingHorizontal: 4 }}
      >
        <View className="flex-row gap-2">
          {sections.map((section) => (
            <Pressable
              key={section.key}
              onPress={() => setActiveSection(section.key)}
              className={`rounded-full px-4 py-2.5 ${
                activeSection === section.key
                  ? `bg-${section.color}-500/20 border border-${section.color}-400/30`
                  : "bg-white/5 border border-white/10"
              }`}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                className={`text-xs font-bold ${
                  activeSection === section.key
                    ? `text-${section.color}-200`
                    : "text-slate-400"
                }`}
              >
                {section.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderFormInputs = () => {
    if (activeSection === "products") {
      return (
        <View className="mb-4 rounded-xl bg-slate-800/30 p-4 border border-slate-700/50">
          <Text className="mb-3 text-xs font-bold uppercase tracking-[2px] text-slate-400">
            Product Form
          </Text>
          <View className="gap-2">
            <TextInput
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              placeholder="Product name (optional)"
              placeholderTextColor="#64748b"
              value={productName}
              onChangeText={setProductName}
            />
            <TextInput
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              placeholder="SKU (optional)"
              placeholderTextColor="#64748b"
              value={productSku}
              onChangeText={setProductSku}
            />
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                placeholder="Price (default: 100)"
                placeholderTextColor="#64748b"
                value={productPrice}
                onChangeText={setProductPrice}
                keyboardType="decimal-pad"
              />
              <TextInput
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                placeholder="Stock (default: 10)"
                placeholderTextColor="#64748b"
                value={productStock}
                onChangeText={setProductStock}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      );
    }

    if (activeSection === "categories") {
      return (
        <View className="mb-4 rounded-xl bg-slate-800/30 p-4 border border-slate-700/50">
          <Text className="mb-3 text-xs font-bold uppercase tracking-[2px] text-slate-400">
            Category Form
          </Text>
          <TextInput
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            placeholder="Category name (optional)"
            placeholderTextColor="#64748b"
            value={categoryName}
            onChangeText={setCategoryName}
          />
        </View>
      );
    }

    if (activeSection === "customers") {
      return (
        <View className="mb-4 rounded-xl bg-slate-800/30 p-4 border border-slate-700/50">
          <Text className="mb-3 text-xs font-bold uppercase tracking-[2px] text-slate-400">
            Customer Form
          </Text>
          <TextInput
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            placeholder="Customer name (optional)"
            placeholderTextColor="#64748b"
            value={customerName}
            onChangeText={setCustomerName}
          />
        </View>
      );
    }

    if (activeSection === "stores") {
      return (
        <View className="mb-4 rounded-xl bg-slate-800/30 p-4 border border-slate-700/50">
          <Text className="mb-3 text-xs font-bold uppercase tracking-[2px] text-slate-400">
            Store Form
          </Text>
          <TextInput
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            placeholder="Store name (optional)"
            placeholderTextColor="#64748b"
            value={storeName}
            onChangeText={setStoreName}
          />
        </View>
      );
    }

    if (activeSection === "generic") {
      return (
        <View className="mb-4 rounded-xl bg-slate-800/30 p-4 border border-slate-700/50">
          <Text className="mb-3 text-xs font-bold uppercase tracking-[2px] text-slate-400">
            Generic Record Form
          </Text>
          <View className="gap-2">
            <TextInput
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              placeholder="Entity name (e.g., test_data)"
              placeholderTextColor="#64748b"
              value={genericEntity}
              onChangeText={setGenericEntity}
            />
            <TextInput
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              placeholder='JSON data e.g. {"name":"test","value":123}'
              placeholderTextColor="#64748b"
              value={genericData}
              onChangeText={setGenericData}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      );
    }

    return null;
  };

  const renderActionButtons = () => {
    const buttons: { label: string; onPress: () => void; color?: string }[] =
      [];

    if (activeSection === "products") {
      buttons.push(
        { label: "➕ Create", onPress: testCreateProduct },
        { label: "📋 Get All", onPress: testGetProducts },
        { label: "🔍 By Barcode", onPress: testGetProductByBarcode },
        { label: "✏️ Update", onPress: testUpdateProduct },
        { label: "🗑️ Delete", onPress: testDeleteProduct },
        { label: "📥 Upsert", onPress: testUpsertProducts },
      );
    } else if (activeSection === "categories") {
      buttons.push(
        { label: "➕ Create", onPress: testCreateCategory },
        { label: "📋 Get All", onPress: testGetCategories },
        { label: "✏️ Update", onPress: testUpdateCategory },
        { label: "🗑️ Delete", onPress: testDeleteCategory },
        { label: "📥 Upsert", onPress: testUpsertCategories },
      );
    } else if (activeSection === "customers") {
      buttons.push(
        { label: "➕ Create", onPress: testCreateCustomer },
        { label: "📋 Get All", onPress: testGetCustomers },
        { label: "✏️ Update", onPress: testUpdateCustomer },
        { label: "🗑️ Delete", onPress: testDeleteCustomer },
        { label: "📥 Upsert", onPress: testUpsertCustomers },
      );
    } else if (activeSection === "stores") {
      buttons.push(
        { label: "➕ Create", onPress: testCreateStore },
        { label: "📋 Get All", onPress: testGetStores },
        { label: "✏️ Update", onPress: testUpdateStore },
        { label: "🗑️ Delete", onPress: testDeleteStore },
        { label: "📥 Upsert", onPress: testUpsertStores },
      );
    } else if (activeSection === "sessions") {
      buttons.push(
        { label: "🔓 Open", onPress: testOpenSession },
        { label: "🔍 Get Active", onPress: testGetActiveSession },
        { label: "🔒 Close", onPress: testCloseSession },
        { label: "📥 Upsert", onPress: testUpsertSessions },
      );
    } else if (activeSection === "orders") {
      buttons.push(
        { label: "➕ Create", onPress: testCreateOrder },
        { label: "📋 Get All", onPress: testGetOrders },
        { label: "🔍 By ID", onPress: testGetOrderById },
        { label: "✏️ Update Status", onPress: testUpdateOrderStatus },
        { label: "🗑️ Delete", onPress: testDeleteOrder },
        { label: "📥 Upsert", onPress: testUpsertOrders },
      );
    } else if (activeSection === "inventory") {
      buttons.push(
        { label: "📋 Get All", onPress: testGetInventory },
        { label: "📦 Movement", onPress: testCreateInventoryMovement },
        { label: "📊 Count", onPress: testCreateInventoryCount },
      );
    } else if (activeSection === "sync") {
      buttons.push(
        { label: "📋 Get Outbox", onPress: testGetOutboxItems },
        { label: "⏰ Get Due", onPress: testGetDueOutboxItems },
        { label: "❌ Get Failed", onPress: testGetFailedOutboxItems },
        { label: "🔄 Retry", onPress: testRetryOutboxItem },
        { label: "✅ Mark Synced", onPress: testMarkOutboxSynced },
        { label: "❌ Mark Failed", onPress: testMarkOutboxFailed },
        { label: "💀 Mark Dead", onPress: testMarkOutboxDead },
        { label: "🔄 Entity Synced", onPress: testMarkEntitySynced },
        { label: "❌ Entity Failed", onPress: testMarkEntitySyncFailed },
        { label: "🔄 Order Synced", onPress: testMarkOrderSynced },
        { label: "❌ Order Failed", onPress: testMarkOrderSyncFailed },
      );
    } else if (activeSection === "generic") {
      buttons.push(
        { label: "➕ Create", onPress: testCreateGenericRecord },
        { label: "📋 Get All", onPress: testGetGenericRecords },
        { label: "✏️ Update", onPress: testUpdateGenericRecord },
        { label: "🗑️ Delete", onPress: testDeleteGenericRecord },
        { label: "📥 Upsert", onPress: testUpsertGenericRecords },
      );
    }

    return (
      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {buttons.map((btn, index) => (
            <Pressable
              key={index}
              onPress={btn.onPress}
              className="rounded-full bg-slate-700/50 px-4 py-2.5 border border-slate-600/50"
              disabled={isLoading}
            >
              <Text className="text-xs font-bold text-white">{btn.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderDataList = () => {
    let data: any[] = [];
    let title = "";

    switch (activeSection) {
      case "products":
        data = products;
        title = "Products";
        break;
      case "categories":
        data = categories;
        title = "Categories";
        break;
      case "customers":
        data = customers;
        title = "Customers";
        break;
      case "stores":
        data = stores;
        title = "Stores";
        break;
      case "sessions":
        data = sessionData ? [sessionData] : [];
        title = "Sessions";
        break;
      case "orders":
        data = orders;
        title = "Orders";
        break;
      case "inventory":
        data = inventory;
        title = "Inventory";
        break;
      case "sync":
        data = outboxItems;
        title = "Outbox Items";
        break;
      case "generic":
        data = genericRecords;
        title = "Generic Records";
        break;
      default:
        data = [];
        title = "";
    }

    if (isLoading) {
      return (
        <View className="mb-4 rounded-xl bg-slate-800/50 p-8 border border-slate-700/50">
          <ActivityIndicator size="large" color="#34d399" />
          <Text className="mt-3 text-center text-slate-400">Loading...</Text>
        </View>
      );
    }

    if (data.length === 0) {
      return (
        <View className="mb-4 rounded-xl bg-slate-800/50 p-8 border border-slate-700/50">
          <Text className="text-center text-slate-400">
            No {title.toLowerCase()} found
          </Text>
        </View>
      );
    }

    return (
      <View className="mb-4 rounded-xl bg-slate-800/50 p-4 border border-slate-700/50">
        <Text className="mb-3 font-bold text-white">
          {title}: {data.length}
        </Text>
        <ScrollView className="max-h-[200px]">
          {data.map((item, index) => (
            <View
              key={item.id || index}
              className="border-b border-slate-700/50 py-2.5"
            >
              <Text className="text-sm font-medium text-white">
                {item.name || item.id || `Item ${index + 1}`}
              </Text>
              <Text className="text-xs text-slate-400">ID: {item.id}</Text>
              {item.sku && (
                <Text className="text-xs text-slate-400">SKU: {item.sku}</Text>
              )}
              {item.stockQuantity !== undefined && (
                <Text className="text-xs text-slate-400">
                  Stock: {item.stockQuantity}
                </Text>
              )}
              {item.sellingPrice !== undefined && (
                <Text className="text-xs text-slate-400">
                  Price: ${item.sellingPrice}
                </Text>
              )}
              {item.status && (
                <Text className="text-xs text-slate-400">
                  Status: {item.status}
                </Text>
              )}
              {item.tier && (
                <Text className="text-xs text-slate-400">
                  Tier: {item.tier}
                </Text>
              )}
              {item.role && (
                <Text className="text-xs text-slate-400">
                  Role: {item.role}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderStats = () => {
    const stats = [
      { label: "Products", value: products.length },
      { label: "Categories", value: categories.length },
      { label: "Customers", value: customers.length },
      { label: "Stores", value: stores.length },
      { label: "Orders", value: orders.length },
      { label: "Queue", value: queuedCount },
    ];

    return (
      <View className="mb-4 flex-row flex-wrap gap-2">
        {stats.map((stat) => (
          <View
            key={stat.label}
            className="flex-1 min-w-[60px] rounded-xl bg-slate-800/50 p-3 border border-slate-700/50"
          >
            <Text className="text-center text-xs text-slate-400">
              {stat.label}
            </Text>
            <Text className="text-center text-lg font-bold text-white">
              {stat.value}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View className="flex-1">
        {/* Header - Fixed at top */}
        <View className="bg-slate-900 px-4 py-4 border-b border-slate-800">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-white">
                🧪 Repository Test
              </Text>
              <Text className="text-xs text-slate-400">
                Test offline repository functions
              </Text>
            </View>
            {isLoading && <ActivityIndicator size="small" color="#34d399" />}
          </View>
        </View>

        {/* Main Content - Scrollable */}
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{
            paddingTop: 16,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={true}
        >
          {renderStats()}
          {renderSectionButtons()}
          {renderFormInputs()}
          {renderActionButtons()}

          {/* Data List */}
          {renderDataList()}

          {/* Logs Section */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-bold text-white">📝 Logs</Text>
              <View className="flex-row gap-3">
                <Pressable onPress={clearLogs}>
                  <Text className="text-xs text-rose-400">Clear All</Text>
                </Pressable>
                <Text className="text-xs text-slate-400">
                  {logs.length} entries
                </Text>
              </View>
            </View>
            <View
              className="rounded-xl bg-slate-900 p-3 border border-slate-800"
              style={{ minHeight: 150, maxHeight: 300 }}
            >
              <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {logs.length === 0 ? (
                  <Text className="text-center text-xs text-slate-500">
                    No logs yet. Run some tests!
                  </Text>
                ) : (
                  logs.map((log, index) => (
                    <Text
                      key={index}
                      className="font-mono text-xs text-slate-300 py-1.5 border-b border-slate-800/50"
                    >
                      {log}
                    </Text>
                  ))
                )}
              </ScrollView>
            </View>
          </View>

          {/* Bottom spacer for better scrolling */}
          <View className="h-4" />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
