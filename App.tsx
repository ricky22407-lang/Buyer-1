import React, { useState, useEffect } from 'react';
import Header, { AppMode } from './components/Header';
import BottomNav from './components/BottomNav';
import InputSection, { InputMode } from './components/InputSection';
import DashboardSection from './components/DashboardSection';
import ProductGenerator from './components/ProductGenerator';
import ProductList from './components/ProductList';
import { useOrderSystem } from './hooks/useOrderSystem';
import { useScreenMonitor } from './hooks/useScreenMonitor';
import { Info, Sparkles } from 'lucide-react';
import { GROUP_OPTIONS } from './constants';

const App: React.FC = () => {
  // --- Navigation State ---
  const [appMode, setAppMode] = useState<AppMode>('orders');
  
  // --- Input State (UI) ---
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [inputImages, setInputImages] = useState<File[]>([]);
  const [productContext, setProductContext] = useState('');
  const [groupName, setGroupName] = useState(GROUP_OPTIONS[0]);
  const [sellerName, setSellerName] = useState('老闆娘'); // Global Seller Name
  const [showSettings, setShowSettings] = useState(false);
  const [isAiAgentMode, setIsAiAgentMode] = useState(true);

  // --- Business Logic Hooks ---
  const { 
    orders, setOrders, 
    products, updateProduct, addProduct,
    aiInteractions, setAiInteractions, clearAiInteractions,
    isProcessing, error, analyzeContent, processAnalysisResult 
  } = useOrderSystem();

  // Keep productContext updated with current product names for better fuzzy matching
  useEffect(() => {
    if (products.length > 0) {
      const names = products.map(p => p.name).join(', ');
      setProductContext(prev => {
        // Only update if current context is empty or manually hasn't been heavily edited
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

  // --- Render ---
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <Header appMode={appMode} setAppMode={setAppMode} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mt-2 lg:mt-8 pb-24 lg:pb-8">
        
        {appMode === 'generator' ? (
          <ProductGenerator />
        ) : appMode === 'products' ? (
           <ProductList 
             products={products} 
             orders={orders} 
             onUpdateProduct={updateProduct}
             onAddProduct={addProduct}
           />
        ) : (
          <>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 lg:p-4 mb-4 lg:mb-6 flex items-start gap-3 mx-1 lg:mx-0 shadow-sm">
              <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-sm flex-shrink-0 mt-0.5">
                <Sparkles size={18} />
              </div>
              <div className="text-sm text-blue-900">
                <p className="font-bold mb-1 text-blue-800">精準抓單更新：身分比對與自動指令</p>
                <ul className="list-disc pl-4 space-y-1 text-xs lg:text-sm text-blue-700">
                  <li><strong>「上架」自動開單</strong>：賣家訊息中包含「上架」字眼，AI 會自動偵測品名、售價並建立商品。</li>
                  <li><strong>「#代喊」小編功能</strong>：若小編喊出「#代喊 @客戶名 戒指+1」，系統會自動將訂單歸屬給該客戶。</li>
                  <li><strong>身分鎖定</strong>：僅「連線設定」中標記的小編/賣家能觸發上架與代喊功能，確保安全。</li>
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
                />
              </div>

              <div className="lg:col-span-2">
                <DashboardSection 
                  orders={orders}
                  setOrders={setOrders}
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