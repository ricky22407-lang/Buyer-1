import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Order, Product, AiInteraction, AnalysisResult, OrderStatus, RawOrder } from '../types';
import { parseChatLogs } from '../services/geminiService';
import { DatabaseService, supabase } from '../services/supabaseService';

export const useOrderSystem = () => {
  // Use LocalStorage ONLY for AI interactions (chat logs), 
  // Orders and Products are now synced via Cloud (Supabase).
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Ref to track latest orders/products without triggering re-renders in callbacks
  const ordersRef = useRef<Order[]>([]);
  const productsRef = useRef<Product[]>([]);

  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { productsRef.current = products; }, [products]);

  const [aiInteractions, setAiInteractions] = useState<AiInteraction[]>(() => {
    try {
      const saved = localStorage.getItem('linePlusOne_aiInteractions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false); // Default to false until verified

  // --- Cloud Sync: Fetch Initial Data ---
  useEffect(() => {
    if (!DatabaseService.isReady) {
      // Fallback to LocalStorage if no Cloud
      try {
         const localOrders = localStorage.getItem('linePlusOne_orders');
         if (localOrders) setOrders(JSON.parse(localOrders));
         const localProducts = localStorage.getItem('linePlusOne_products');
         if (localProducts) setProducts(JSON.parse(localProducts));
      } catch(e) {}
      return;
    }

    const loadData = async () => {
      const [ordersRes, productsRes] = await Promise.all([
        DatabaseService.fetchOrders(),
        DatabaseService.fetchProducts()
      ]);

      if (ordersRes.error || productsRes.error) {
        console.error("Cloud connection error:", ordersRes.error || productsRes.error);
        setIsCloudConnected(false);
        // If error is 404 or table missing, it implies SQL wasn't run
        setError("已連線至 Supabase 但讀取失敗，請確認您已在 Supabase SQL Editor 執行建表指令。");
        return;
      }

      setOrders(ordersRes.data);
      setProducts(productsRes.data);
      setIsCloudConnected(true);
      setError(null);
    };

    loadData();
  }, []);

  // --- Cloud Sync: Realtime Subscription ---
  useEffect(() => {
    if (!supabase || !isCloudConnected) return;

    // Listen for changes in 'orders' table
    const orderSub = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newOrder = payload.new.body as Order;
          setOrders(prev => {
            const index = prev.findIndex(o => o.id === newOrder.id);
            if (index > -1) {
              const newArr = [...prev];
              newArr[index] = newOrder;
              return newArr;
            }
            return [...prev, newOrder];
          });
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id; // Correct way to get ID on DELETE
          setOrders(prev => prev.filter(o => o.id !== deletedId));
        }
      })
      .subscribe();

    // Listen for changes in 'products' table
    const productSub = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newProduct = payload.new.body as Product;
          setProducts(prev => {
            const index = prev.findIndex(p => p.id === newProduct.id);
            if (index > -1) {
              const newArr = [...prev];
              newArr[index] = newProduct;
              return newArr;
            }
            return [newProduct, ...prev]; // Newest first usually
          });
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id;
          setProducts(prev => prev.filter(p => p.id !== deletedId));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderSub);
      supabase.removeChannel(productSub);
    };
  }, [isCloudConnected]);

  // --- Local Persistence for AI Chat Logs (Private to device) ---
  useEffect(() => {
    localStorage.setItem('linePlusOne_aiInteractions', JSON.stringify(aiInteractions));
  }, [aiInteractions]);

  // --- Fallback Persistence for Orders/Products (in case Cloud fails) ---
  useEffect(() => {
    if (!isCloudConnected) {
        localStorage.setItem('linePlusOne_orders', JSON.stringify(orders));
        localStorage.setItem('linePlusOne_products', JSON.stringify(products));
    }
  }, [orders, products, isCloudConnected]);

  // --- CRUD Operations that Handle Cloud Sync ---

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    const currentOrder = orders.find(o => o.id === id);
    if (!currentOrder) return;
    
    const updatedOrder = { ...currentOrder, ...updates };

    // Optimistic Update
    setOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));

    if (isCloudConnected) {
      await DatabaseService.upsertOrders([updatedOrder]);
    }
  };

  const deleteOrder = async (id: string) => {
    // Optimistic Update
    setOrders(prev => prev.filter(o => o.id !== id));

    if (isCloudConnected) {
      await DatabaseService.deleteOrder(id);
    }
  };

  const syncProductToCloud = async (newProduct: Product) => {
    if (isCloudConnected) {
      await DatabaseService.upsertProducts([newProduct]);
    } else {
      setProducts(prev => {
         const exists = prev.find(p => p.id === newProduct.id);
         return exists ? prev.map(p => p.id === newProduct.id ? newProduct : p) : [newProduct, ...prev];
      });
    }
  };

  const deleteProduct = async (id: string) => {
    // Optimistic Update
    setProducts(prev => prev.filter(p => p.id !== id));
    
    if (isCloudConnected) {
      await DatabaseService.deleteProduct(id);
    }
  };

  // Core logic to merge new analysis results
  const processAnalysisResult = useCallback(async (
    result: AnalysisResult, 
    source: 'manual' | 'image' | 'monitor',
    groupName: string
  ) => {
    const rawOrders = result.orders || [];
    const newProducts = result.products || [];
    const newInteractions = result.aiInteractions || [];

    // 1. Process Orders
    // FIX: Use ordersRef.current to get the latest orders synchronously
    // This avoids the issue where setOrders callback runs after the logic checks
    const currentOrders = ordersRef.current;
    
    if (rawOrders.length > 0) {
      const processedOrders: Order[] = rawOrders.map((raw: RawOrder) => ({
        id: uuidv4(),
        ...raw,
        price: raw.detectedPrice || 0,
        status: raw.isModification ? OrderStatus.MODIFIED : OrderStatus.PENDING,
        timestamp: Date.now(),
        source: source,
        groupName: groupName || '預設群組'
      }));
      
      const uniqueOrdersToAdd: Order[] = [];
      
      processedOrders.forEach(newOrder => {
          const isDuplicate = currentOrders.some(existing => {
              const isSameUser = existing.buyerName === newOrder.buyerName;
              const isSameItem = existing.itemName === newOrder.itemName;
              const isSameGroup = existing.groupName === newOrder.groupName;
              // Check dup if within 10 minutes to prevent spam
              const isRecent = (Date.now() - existing.timestamp) < 1000 * 60 * 10; 
              return isSameUser && isSameItem && isSameGroup && isRecent;
          });
          if (!isDuplicate) uniqueOrdersToAdd.push(newOrder);
      });

      if (uniqueOrdersToAdd.length > 0) {
        if (isCloudConnected) {
            await DatabaseService.upsertOrders(uniqueOrdersToAdd);
        } else {
            setOrders(prev => [...prev, ...uniqueOrdersToAdd]);
        }
      }
    }

    // 2. Process Products (Use productsRef for consistency)
    const currentProducts = productsRef.current;
    if (newProducts.length > 0) {
      const processedProducts: Product[] = newProducts.map(p => ({
        ...p,
        id: uuidv4(),
        timestamp: Date.now(),
        purchasedQty: 0,
        purchaseNotes: '',
        specs: p.specs || [],
        bulkRules: p.bulkRules || []
      }));

      const productsToSync: Product[] = [];
      
      processedProducts.forEach(newP => {
        const existingIdx = currentProducts.findIndex(ep => {
            const n1 = ep.name.trim().toLowerCase();
            const n2 = newP.name.trim().toLowerCase();
            return (n1 === n2) || (n1.length > 3 && n2.length > 3 && (n1.includes(n2) || n2.includes(n1)));
        });

        if (existingIdx > -1) {
            const updated = {
                ...currentProducts[existingIdx],
                price: newP.price || currentProducts[existingIdx].price,
                type: newP.type || currentProducts[existingIdx].type,
                specs: newP.specs.length > currentProducts[existingIdx].specs!.length ? newP.specs : currentProducts[existingIdx].specs,
                description: newP.description || currentProducts[existingIdx].description
            };
            productsToSync.push(updated);
        } else {
            productsToSync.push(newP);
        }
      });

      if (productsToSync.length > 0) {
         if (isCloudConnected) {
             DatabaseService.upsertProducts(productsToSync);
         } else {
             // Local update logic
             setProducts(prev => {
                const newState = [...prev];
                productsToSync.forEach(p => {
                    const idx = newState.findIndex(ep => ep.id === p.id);
                    if (idx > -1) newState[idx] = p;
                    else newState.unshift(p);
                });
                return newState;
             });
         }
      }
    }

    // 3. Process AI Interactions (Local Only)
    if (newInteractions.length > 0) {
      const timestamped = newInteractions.map(i => ({...i, id: uuidv4(), timestamp: Date.now()}));
      setAiInteractions(prev => [...timestamped, ...prev]);
    }
  }, [isCloudConnected]);

  // Trigger Gemini API
  const analyzeContent = useCallback(async (
    input: string | File[], 
    productContext: string, 
    source: 'manual' | 'image',
    groupName: string,
    sellerName: string
  ) => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await parseChatLogs(input, productContext, sellerName);
      await processAnalysisResult(result, source, groupName);
    } catch (err) {
      console.error(err);
      setError('分析失敗，請檢查 API Key 或網路連線。');
    } finally {
      setIsProcessing(false);
    }
  }, [processAnalysisResult]);

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const current = products.find(p => p.id === id);
    if (!current) return;
    const updated = { ...current, ...updates };
    await syncProductToCloud(updated);
  };

  const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'timestamp' | 'purchasedQty' | 'purchaseNotes'>) => {
    const newProduct: Product = {
      ...productData,
      id: uuidv4(),
      timestamp: Date.now(),
      purchasedQty: 0,
      purchaseNotes: '',
      specs: productData.specs || [],
      bulkRules: productData.bulkRules || []
    };
    await syncProductToCloud(newProduct);
  }, [isCloudConnected]);

  const clearAiInteractions = () => {
    setAiInteractions([]);
  };

  return {
    orders,
    setOrders, 
    updateOrder,
    deleteOrder,
    products,
    updateProduct,
    addProduct,
    deleteProduct, // Exported
    setProducts,
    aiInteractions,
    setAiInteractions,
    isProcessing,
    error,
    setError,
    analyzeContent,
    processAnalysisResult,
    clearAiInteractions,
    isCloudConnected
  };
};