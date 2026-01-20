import React, { useMemo } from 'react';
import { Order, OrderStatus } from '../types';
import { User, Copy, CheckCircle, Plus, Minus, Trash2 } from 'lucide-react';

interface BuyerSummaryProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => void;
  onDeleteOrder: (id: string) => void;
}

interface BuyerGroup {
  name: string;
  items: Order[];
  totalAmount: number;
  totalQuantity: number;
}

const BuyerSummary: React.FC<BuyerSummaryProps> = ({ orders, onUpdateOrder, onDeleteOrder }) => {
  const buyerGroups = useMemo(() => {
    const groups: { [key: string]: BuyerGroup } = {};

    orders.forEach(order => {
      if (!groups[order.buyerName]) {
        groups[order.buyerName] = {
          name: order.buyerName,
          items: [],
          totalAmount: 0,
          totalQuantity: 0
        };
      }
      groups[order.buyerName].items.push(order);
      // Only add to total if not cancelled (though logic handles negative quantity naturally)
      groups[order.buyerName].totalQuantity += order.quantity;
      groups[order.buyerName].totalAmount += (order.price * order.quantity);
    });

    // Filter out buyers with 0 or negative total quantity (fully cancelled) if desired, 
    // or keep them to show history. Let's keep them but sort by amount.
    return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [orders]);

  const copyBillToClipboard = (group: BuyerGroup) => {
    const validItems = group.items.filter(i => i.quantity !== 0);
    const itemsList = validItems.map(i => 
      `- ${i.itemName} x ${i.quantity} ($${i.price})`
    ).join('\n');

    const message = `Hi @${group.name} 
您的代購清單如下：
${itemsList}
----------------
總金額：$${group.totalAmount.toLocaleString()}
請於今日完成匯款，感謝！`;

    navigator.clipboard.writeText(message);
    alert(`已複製 @${group.name} 的結單訊息！`);
  };

  const handleAdjustQuantity = (order: Order, delta: number) => {
    const newQty = order.quantity + delta;
    if (newQty < 0) return; // Prevent negative unless intended, but usually stop at 0
    onUpdateOrder(order.id, { quantity: newQty });
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('確定要刪除這筆項目嗎？')) {
      onDeleteOrder(id);
    }
  };

  if (buyerGroups.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
        <User className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <h3 className="text-lg font-medium text-gray-900">尚無買家資料</h3>
        <p className="text-gray-500">請先分析對話紀錄以生成統計。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {buyerGroups.map((group) => (
        <div key={group.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col">
          <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-3">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3 font-bold">
                {group.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{group.name}</h3>
                <span className="text-xs text-gray-500">{group.items.length} 筆紀錄</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#06C755]">${group.totalAmount.toLocaleString()}</p>
              <p className="text-xs text-gray-500">總數量: {group.totalQuantity}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-60 space-y-2 mb-4 pr-1">
            {group.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg group">
                 {/* Item Info */}
                 <div className="flex-1 min-w-0 mr-2">
                    <div className={`text-sm truncate ${item.quantity <= 0 ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {item.itemName}
                    </div>
                    <div className="text-xs text-gray-400">${item.price} / 個</div>
                 </div>

                 {/* Interactive Controls */}
                 <div className="flex items-center space-x-2">
                    {/* Quantity Control */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-md h-7">
                       <button 
                         onClick={() => handleAdjustQuantity(item, -1)}
                         className="px-2 text-gray-500 hover:bg-gray-100 h-full flex items-center rounded-l-md"
                       >
                         <Minus size={12} />
                       </button>
                       <span className={`text-xs font-bold w-6 text-center ${item.quantity === 0 ? 'text-red-500' : 'text-gray-700'}`}>
                         {item.quantity}
                       </span>
                       <button 
                         onClick={() => handleAdjustQuantity(item, 1)}
                         className="px-2 text-gray-500 hover:bg-gray-100 h-full flex items-center rounded-r-md"
                       >
                         <Plus size={12} />
                       </button>
                    </div>

                    {/* Delete */}
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                      title="刪除"
                    >
                      <Trash2 size={14} />
                    </button>
                 </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => copyBillToClipboard(group)}
            className="mt-auto w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center text-sm font-medium transition-colors border border-gray-200"
          >
            <Copy size={16} className="mr-2" />
            複製結單訊息
          </button>
        </div>
      ))}
    </div>
  );
};

export default BuyerSummary;