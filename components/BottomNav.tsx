import React from 'react';
import { Wand2, Package, ShoppingBag, Globe } from 'lucide-react';
import { AppMode } from './Header';

interface BottomNavProps {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ appMode, setAppMode }) => {
  const navItems = [
    { id: 'orders', label: '訂單管理', icon: ShoppingBag },
    { id: 'products', label: '商品/採購', icon: Package },
    { id: 'trends', label: 'AI 選品', icon: Globe },
    { id: 'generator', label: '圖卡生成', icon: Wand2 },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = appMode === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => setAppMode(item.id as AppMode)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-[#06C755]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`p-1 rounded-full transition-all ${isActive ? 'bg-green-50 transform scale-110' : ''}`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-[#06C755]' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;