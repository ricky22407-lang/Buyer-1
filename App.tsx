import React, { useState } from 'react';
import Header, { AppMode } from './components/Header';
import BottomNav from './components/BottomNav';
import InputSection, { InputMode } from './components/InputSection';
import DashboardSection from './components/DashboardSection';
import ProductGenerator from './components/ProductGenerator';
import ProductList from './components/ProductList';
import { useOrderSystem } from './hooks/useOrderSystem';
import { useScreenMonitor } from './hooks/useScreenMonitor';
import { Info } from 'lucide-react';
import { GROUP_OPTIONS } from './constants';

const App: React.FC = () => {
  // --- Navigation State ---
  const [appMode, setAppMode] = useState<AppMode>('orders');
  
  // --- Input State (UI) ---
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [inputImages, setInputImages] = useState<File[]>([]);
  const [productContext, setProductContext] = useState('');
  const [groupName, setGroupName] = useState(GROUP_OPTIONS[0]); // Default to first option
  const [showSettings, setShowSettings] = useState(false);
  const [isAiAgentMode, setIsAiAgentMode] = useState(true);

  // --- Business Logic Hooks ---
  const { 
    orders, setOrders, 
    products, updateProduct, addProduct,
    aiInteractions, setAiInteractions, clearAiInteractions,
    isProcessing, error, analyzeContent, processAnalysisResult 
  } = useOrderSystem();

  const {
    videoRef, canvasRef,
    isMonitoring, startMonitoring, stopMonitoring,
    monitorLogs, monitorError
  } = useScreenMonitor({
    onAnalyzeComplete: processAnalysisResult,
    productContext,
    groupName
  });

  // --- Actions ---
  const handleManualAnalyze = () => {
    const input = inputMode === 'text' ? inputText : inputImages;
    analyzeContent(input, productContext, inputMode === 'image' ? 'image' : 'manual', groupName);
    if (inputMode === 'image') setInputImages([]);
  };

  const handleClearInput = () => {
    setInputText('');
    setInputImages([]);
    clearAiInteractions();
  };

  // --- Render ---
  return (
    // Use dynamic viewport height (dvh) for better mobile browser support
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <Header appMode={appMode} setAppMode={setAppMode} />

      {/* Added pb-20 to prevent content being hidden behind BottomNav on mobile */}
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
            {/* Announcement / Help Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 lg:p-4 mb-4 lg:mb-6 flex items-start gap-3 mx-1 lg:mx-0 shadow-sm">
              <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-blue-800">
                <p className="font-bold mb-1">功能更新：支援多群組與標籤管理</p>
                <ul className="list-disc pl-4 space-y-1 text-xs lg:text-sm">
                  <li>在「設定」中選擇目前監控的<strong>群組名稱</strong> (Eight / Cactus)，系統會自動標記訂單來源。</li>
                  <li>若需同時監控兩個群組，請開啟兩個瀏覽器分頁，分別設定不同名稱即可。</li>
                  <li>匯出的 CSV 報表現在包含群組欄位，方便拆單。</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Left Column: Inputs & Settings */}
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

              {/* Right Column: Dashboard & Results */}
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

      {/* Mobile Bottom Navigation */}
      <BottomNav appMode={appMode} setAppMode={setAppMode} />
    </div>
  );
};

export default App;