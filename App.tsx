import React, { useState, useEffect } from 'react';
import Header, { AppMode } from './components/Header';
import BottomNav from './components/BottomNav';
import InputSection, { InputMode } from './components/InputSection';
import DashboardSection from './components/DashboardSection';
import ProductGenerator from './components/ProductGenerator';
import ProductList from './components/ProductList';
import TrendDiscovery from './components/TrendDiscovery'; // Import
import { useOrderSystem } from './hooks/useOrderSystem';
import { useScreenMonitor } from './hooks/useScreenMonitor';
import { Sparkles, Cloud, CloudOff } from 'lucide-react';
import { GROUP_OPTIONS } from './constants';
import { Order, Product, AiInteraction, TrendItem } from './types';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  // --- Navigation State ---
  const [appMode, setAppMode] = useState<AppMode>('orders');
  
  // --- Input State (UI) ---
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [inputImages, setInputImages] = useState<File[]>([]);

  // --- Generator State Integration ---
  const [initialGeneratorData, setInitialGeneratorData] = useState<{name: string, price: number, description: string, imageUrl?: string} | null>(null);

  // --- Trend Discovery State (Lifted for Persistence) ---
  const [trendItems, setTrendItems] = useState<TrendItem[]>([]);
  const [trendCountry, setTrendCountry] = useState('日本');
  const [trendCategories, setTrendCategories] = useState<string[]>(['美妝保養']);

  // --- Persistent Settings State (Local Only) ---
  const [productContext, setProductContext] = useState(() => localStorage.getItem('linePlusOne_productContext') || '');
  const [groupName, setGroupName] = useState(() => localStorage.getItem('linePlusOne_groupName') || GROUP_OPTIONS[0]);
  const [sellerName, setSellerName] = useState(() => localStorage.getItem('linePlusOne_sellerName') || '老闆娘');
  const [showSettings, setShowSettings] = useState(() => localStorage.getItem('linePlusOne_showSettings') === 'true');
  const [isAiAgentMode, setIsAiAgentMode] = useState(() => {
    const saved = localStorage.getItem('linePlusOne_isAiAgentMode');
    return saved !== null ? saved === 'true' : true;
  });

  // --- Supabase Credentials ---
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem('linePlusOne_supabaseUrl') || '');
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem('linePlusOne_supabaseKey') || '');

  // --- Persistence Effects ---
  useEffect(() => { localStorage.setItem('linePlusOne_productContext', productContext); }, [productContext]);
  useEffect(() => { localStorage.setItem('linePlusOne_groupName', groupName); }, [groupName]);
  useEffect(() => { localStorage.setItem('linePlusOne_sellerName', sellerName); }, [sellerName]);
  useEffect(() => { localStorage.setItem('linePlusOne_showSettings', String(showSettings)); }, [showSettings]);
  useEffect(() => { localStorage.setItem('linePlusOne_isAiAgentMode', String(isAiAgentMode)); }, [isAiAgentMode]);
  
  // Save credentials AND reload if they change (to re-init Supabase client)
  const handleSupabaseSave = () => {
    localStorage.setItem('linePlusOne_supabaseUrl', supabaseUrl);
    localStorage.setItem('linePlusOne_supabaseKey', supabaseKey);
    window.location.reload(); // Reload to initialize service with new keys
  };

  // --- Business Logic Hooks ---
  const { 
    orders, setOrders, updateOrder, deleteOrder,
    products, updateProduct, addProduct, deleteProduct, setProducts,
    aiInteractions, setAiInteractions, clearAiInteractions,
    isProcessing, error, analyzeContent, processAnalysisResult,
    isCloudConnected
  } = useOrderSystem();

  // Keep productContext updated with current product names for better fuzzy matching
  useEffect(() => {
    if (products.length > 0) {
      const names = products.map(p => p.name).join(', ');
      setProductContext(prev => {
        if (!prev) return names;
        return prev;
      });
    }
  }, [products]);

  const {
    videoRef, canvasRef,
    isMonitoring, startMonitoring, stopMonitoring,
    monitorLogs, monitorError
  } = useScreenMonitor({
    onAnalyzeComplete: processAnalysisResult,
    productContext,
    groupName,
    sellerName
  });

  // --- Actions ---
  const handleManualAnalyze = () => {
    const input = inputMode === 'text' ? inputText : inputImages;
    analyzeContent(input, productContext, inputMode === 'image' ? 'image' : 'manual', groupName, sellerName);
    if (inputMode === 'image') setInputImages([]);
  };

  const handleClearInput = () => {
    setInputText('');
    setInputImages([]);
    clearAiInteractions();
  };

  const handleTrendAddProduct = (productData: any) => {
    addProduct(productData);
    alert('已加入商品採購列表！');
    setAppMode('products');
  };

  const handleTrendGenerateCard = (data: { name: string, price: number, description: string, imageUrl?: string }) => {
    setInitialGeneratorData(data);
    setAppMode('generator');
  };

  // --- Data Sync Logic ---
  const handleExportData = () => {
    const data = {
      orders,
      products,
      aiInteractions,
      settings: { productContext, groupName, sellerName, isAiAgentMode },
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LinePlusOne_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm('確定要手動匯入舊資料嗎？')) {
           if (json.orders) setOrders(json.orders);
           if (json.products) setProducts(json.products);
           if (json.aiInteractions) setAiInteractions(json.aiInteractions);
           alert('資料匯入成功！');
        }
      } catch (err) { alert('檔案格式錯誤'); }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  // --- Render ---
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <Header appMode={appMode} setAppMode={setAppMode} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mt-2 lg:mt-8 pb-24 lg:pb-8">
        
        {appMode === 'generator' ? (
          <ProductGenerator initialData={initialGeneratorData} />
        ) : appMode === 'trends' ? (
          <TrendDiscovery 
            onAddProduct={handleTrendAddProduct}
            onGenerateCard={handleTrendGenerateCard}
            items={trendItems}
            setItems={setTrendItems}
            selectedCountry={trendCountry}
            setSelectedCountry={setTrendCountry}
            selectedCategories={trendCategories}
            setSelectedCategories={setTrendCategories}
          />
        ) : appMode === 'products' ? (
           <ProductList 
             products={products} 
             orders={orders} 
             onUpdateProduct={updateProduct}
             onAddProduct={addProduct}
             onDeleteProduct={deleteProduct}
           />
        ) : (
          <>
            <div className={`border rounded-xl p-3 lg:p-4 mb-4 lg:mb-6 flex items-start gap-3 mx-1 lg:mx-0 shadow-sm ${isCloudConnected ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'}`}>
              <div className={`p-1.5 rounded-lg text-white shadow-sm flex-shrink-0 mt-0.5 ${isCloudConnected ? 'bg-green-600' : 'bg-orange-500'}`}>
                {isCloudConnected ? <Cloud size={18} /> : <CloudOff size={18} />}
              </div>
              <div className={`text-sm ${isCloudConnected ? 'text-green-900' : 'text-orange-900'}`}>
                <p className={`font-bold mb-1 ${isCloudConnected ? 'text-green-800' : 'text-orange-800'}`}>
                  {isCloudConnected ? '雲端即時連線中 (Supabase Realtime)' : '目前為單機離線模式'}
                </p>
                <ul className="list-disc pl-4 space-y-1 text-xs lg:text-sm">
                  {isCloudConnected ? (
                    <>
                      <li><strong>自動同步</strong>：日本上架商品，台灣電腦會即時跳出，無需手動匯入。</li>
                      <li><strong>資料安全</strong>：資料已加密儲存於 Supabase，關閉網頁不會遺失。</li>
                    </>
                  ) : (
                    <>
                      <li><strong>注意</strong>：尚未設定雲端資料庫，資料僅存於此裝置。</li>
                      <li><strong>設定方式</strong>：請展開下方設定，輸入 Supabase URL 與 Key 即可啟用雲端同步。</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="lg:col-span-1">
                <InputSection 
                  inputMode={inputMode}
                  setInputMode={setInputMode}
                  inputText={inputText}
                  setInputText={setInputText}
                  inputImages={inputImages}
                  setInputImages={setInputImages}
                  productContext={productContext}
                  setProductContext={setProductContext}
                  groupName={groupName}
                  setGroupName={setGroupName}
                  sellerName={sellerName}
                  setSellerName={setSellerName}
                  isAiAgentMode={isAiAgentMode}
                  setIsAiAgentMode={setIsAiAgentMode}
                  showSettings={showSettings}
                  setShowSettings={setShowSettings}
                  isProcessing={isProcessing}
                  error={error}
                  onAnalyze={handleManualAnalyze}
                  onClear={handleClearInput}
                  isMonitoring={isMonitoring}
                  startMonitoring={startMonitoring}
                  stopMonitoring={stopMonitoring}
                  monitorLogs={monitorLogs}
                  monitorError={monitorError}
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  onExportData={handleExportData}
                  onImportData={handleImportData}
                  supabaseUrl={supabaseUrl}
                  setSupabaseUrl={setSupabaseUrl}
                  supabaseKey={supabaseKey}
                  setSupabaseKey={setSupabaseKey}
                  onSaveSupabase={handleSupabaseSave}
                />
              </div>

              <div className="lg:col-span-2">
                <DashboardSection 
                  orders={orders}
                  setOrders={setOrders}
                  updateOrder={updateOrder}
                  deleteOrder={deleteOrder}
                  aiInteractions={aiInteractions}
                  clearAiInteractions={clearAiInteractions}
                  isAiAgentMode={isAiAgentMode}
                />
              </div>
            </div>
          </>
        )}
      </main>

      <BottomNav appMode={appMode} setAppMode={setAppMode} />
    </div>
  );
};

export default App;