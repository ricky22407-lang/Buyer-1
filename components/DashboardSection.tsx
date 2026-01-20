import React, { useState } from 'react';
import { Order, AiInteraction } from '../types';
import StatsCard from './StatsCard';
import AiAgentPanel from './AiAgentPanel';
import OrderTable from './OrderTable';
import BuyerSummary from './BuyerSummary';
import { ShoppingCart, Users, Download } from 'lucide-react';
import { exportCSV } from '../utils/csvHelper';

export type ViewMode = 'list' | 'buyer';

interface DashboardSectionProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  aiInteractions: AiInteraction[];
  clearAiInteractions: () => void;
  isAiAgentMode: boolean;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({
  orders,
  setOrders,
  updateOrder,
  deleteOrder,
  aiInteractions,
  clearAiInteractions,
  isAiAgentMode
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  return (
    <div className="flex flex-col h-full">
      
      {/* AI Agent Panel */}
      {isAiAgentMode && aiInteractions.length > 0 && (
        <AiAgentPanel 
          interactions={aiInteractions} 
          onClear={clearAiInteractions} 
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ShoppingCart size={16} className="mr-2" />
            訂單列表
          </button>
          <button
            onClick={() => setViewMode('buyer')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center ${viewMode === 'buyer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Users size={16} className="mr-2" />
            結單統計 (依買家)
          </button>
        </div>

        <button
          onClick={() => exportCSV(orders)}
          disabled={orders.length === 0}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${orders.length === 0 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'}`}
        >
          <Download size={16} className="mr-2" />
          匯出 CSV
        </button>
      </div>

      <StatsCard orders={orders} />
      
      {viewMode === 'list' ? (
        <OrderTable 
          orders={orders} 
          onUpdateOrder={updateOrder}
          onDeleteOrder={deleteOrder}
        />
      ) : (
        <BuyerSummary 
          orders={orders} 
          onUpdateOrder={updateOrder}
          onDeleteOrder={deleteOrder}
        />
      )}
    </div>
  );
};

export default DashboardSection;