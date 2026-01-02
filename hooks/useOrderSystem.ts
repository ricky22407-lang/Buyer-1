import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Order, Product, AiInteraction, AnalysisResult, OrderStatus, RawOrder } from '../types';
import { parseChatLogs } from '../services/geminiService';

export const useOrderSystem = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [aiInteractions, setAiInteractions] = useState<AiInteraction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core logic to merge new analysis results into state
  const processAnalysisResult = useCallback((
    result: AnalysisResult, 
    source: 'manual' | 'image' | 'monitor',
    groupName: string
  ) => {
    const { orders: rawOrders, products: newProducts, aiInteractions: newInteractions } = result;

    // 1. Process Orders with Deduplication Logic
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
      
      if (source === 'monitor') {
         setOrders(prevOrders => {
            const newUniqueOrders: Order[] = [];
            processedOrders.forEach(newOrder => {
                const isDuplicate = prevOrders.some(existing => {
                   const isSameUser = existing.buyerName === newOrder.buyerName;
                   const isSameItem = existing.itemName === newOrder.itemName;
                   // Check Group Name too
                   const isSameGroup = existing.groupName === newOrder.groupName;
                   // Avoid dupes within 10 minutes
                   const isRecent = (Date.now() - existing.timestamp) < 1000 * 60 * 10;
                   return isSameUser && isSameItem && isSameGroup && isRecent;
                });
                if (!isDuplicate) newUniqueOrders.push(newOrder);
            });
            return [...prevOrders, ...newUniqueOrders];
         });
      } else {
         setOrders(prev => [...prev, ...processedOrders]);
      }
    }

    // 2. Process Products with Deduplication
    if (newProducts.length > 0) {
      const processedProducts: Product[] = newProducts.map(p => ({
        ...p,
        id: uuidv4(),
        timestamp: Date.now(),
        purchasedQty: 0,
        purchaseNotes: ''
      }));

      setProducts(prev => {
         const uniqueNew = processedProducts.filter(np => 
             // Avoid adding the same product if detected within last 5 minutes
             !prev.some(ep => ep.name === np.name && (Date.now() - ep.timestamp < 1000 * 60 * 5))
         );
         return [...prev, ...uniqueNew];
      });
    }

    // 3. Process AI Interactions
    if (newInteractions && newInteractions.length > 0) {
      const timestamped = newInteractions.map(i => ({...i, id: uuidv4(), timestamp: Date.now()}));
      setAiInteractions(prev => [...timestamped, ...prev]);
    }
  }, []);

  // Trigger Gemini API
  const analyzeContent = useCallback(async (
    input: string | File[], 
    productContext: string, 
    source: 'manual' | 'image',
    groupName: string
  ) => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await parseChatLogs(input, productContext);
      processAnalysisResult(result, source, groupName);
    } catch (err) {
      console.error(err);
      setError('分析失敗，請檢查 API Key 或網路連線。');
    } finally {
      setIsProcessing(false);
    }
  }, [processAnalysisResult]);

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const addProduct = useCallback((productData: Omit<Product, 'id' | 'timestamp' | 'purchasedQty' | 'purchaseNotes'>) => {
    const newProduct: Product = {
      ...productData,
      id: uuidv4(),
      timestamp: Date.now(),
      purchasedQty: 0,
      purchaseNotes: ''
    };
    setProducts(prev => [newProduct, ...prev]);
  }, []);

  const clearAiInteractions = () => {
    setAiInteractions([]);
  };

  return {
    orders,
    setOrders,
    products,
    updateProduct,
    addProduct,
    aiInteractions,
    setAiInteractions,
    isProcessing,
    error,
    setError,
    analyzeContent,
    processAnalysisResult,
    clearAiInteractions
  };
};