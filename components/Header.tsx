import React from 'react';
import { MessageSquare, Wand2, Package, ShoppingBag, Globe } from 'lucide-react';

export type AppMode = 'orders' | 'products' | 'generator' | 'trends';

interface HeaderProps {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
}

const Header: React.FC<HeaderProps> = ({ appMode, setAppMode }) => {
  return (
    <header className="bg-[#06C755] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 lg:h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-6 w-6" />
          <h1 className="text-lg lg:text-xl font-bold tracking-tight truncate">LinePlusOne 社群代購</h1>
        </div>
        
        {/* Desktop Navigation - Hidden on Mobile */}
        <div className="hidden md:flex space-x-2">
          <button 
            onClick={() => setAppMode('orders')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center ${appMode === 'orders' ? 'bg-white text-[#06C755] shadow-sm' : 'bg-green-700 text-white hover:bg-green-600'}`}
          >
            <ShoppingBag size={16} className="mr-1.5" />
            訂單/客服
          </button>
          <button 
            onClick={() => setAppMode('products')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center ${appMode === 'products' ? 'bg-white text-[#06C755] shadow-sm' : 'bg-green-700 text-white hover:bg-green-600'}`}
          >
            <Package size={16} className="mr-1.5" />
            已上架/採購
          </button>
          <button 
            onClick={() => setAppMode('trends')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center ${appMode === 'trends' ? 'bg-white text-[#06C755] shadow-sm' : 'bg-green-700 text-white hover:bg-green-600'}`}
          >
            <Globe size={16} className="mr-1.5" />
            AI 選品
          </button>
          <button 
            onClick={() => setAppMode('generator')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center ${appMode === 'generator' ? 'bg-white text-[#06C755] shadow-sm' : 'bg-green-700 text-white hover:bg-green-600'}`}
          >
            <Wand2 size={16} className="mr-1.5" />
            圖卡生成
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;