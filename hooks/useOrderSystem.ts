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
    // Defensive check
    const rawOrders = result.orders || [];
    const newProducts = result.products || [];
    const newInteractions = result.aiInteractions || [];

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
                   const isSameGroup = existing.groupName === newOrder.groupName;
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

    // 2. Process Products with Semantic Deduplication
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

      setProducts(prev => {
        let currentProducts = [...prev];
        
        processedProducts.forEach(newP => {
          // Find if product already exists (exact match or high similarity)
          const existingIdx = currentProducts.findIndex(ep => {
            const n1 = ep.name.trim().toLowerCase();
            const n2 = newP.name.trim().toLowerCase();
            // Match if exactly the same OR one contains the other (and they are not too short)
            const isSemanticMatch = n1 === n2 || (n1.length > 3 && n2.length > 3 && (n1.includes(n2) || n2.includes(n1)));
            const isRecent = (Date.now() - ep.timestamp) < 1000 * 60 * 60; // Within 1 hour
            return isSemanticMatch && isRecent;
          });

          if (existingIdx > -1) {
            // Update existing instead of adding
            currentProducts[existingIdx] = {
              ...currentProducts[existingIdx],
              // Keep old ID and stats, but update metadata if new one has more info
              price: newP.price || currentProducts[existingIdx].price,
              type: newP.type || currentProducts[existingIdx].type,
              specs: newP.specs.length > currentProducts[existingIdx].specs!.length ? newP.specs : currentProducts[existingIdx].specs,
              description: newP.description || currentProducts[existingIdx].description
            };
          } else {
            currentProducts.push(newP);
          }
        });

        return currentProducts;
      });
    }

    // 3. Process AI Interactions
    if (newInteractions.length > 0) {
      const timestamped = newInteractions.map(i => ({...i, id: uuidv4(), timestamp: Date.now()}));
      setAiInteractions(prev => [...timestamped, ...prev]);
    }
  }, []);

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
      purchaseNotes: '',
      specs: productData.specs || [],
      bulkRules: productData.bulkRules || []
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