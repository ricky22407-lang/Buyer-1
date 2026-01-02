import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { Trash2, Edit2, Check, X, User, Box } from 'lucide-react';
import { GROUP_OPTIONS } from '../constants';

interface OrderTableProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

const OrderTable: React.FC<OrderTableProps> = ({ orders, setOrders }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Order>>({});

  const handleDelete = (id: string) => {
    if (window.confirm('確定要刪除這筆訂單嗎？')) {
      setOrders(prev => prev.filter(o => o.id !== id));
    }
  };

  const startEdit = (order: Order) => {
    setEditingId(order.id);
    setEditForm({ ...order });
  };

  const saveEdit = () => {
    if (editingId && editForm) {
      setOrders(prev => prev.map(o => (o.id === editingId ? { ...o, ...editForm } as Order : o)));
      setEditingId(null);
      setEditForm({});
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const updateStatus = (id: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: newStatus } : o)));
  };

  const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const colors = {
      [OrderStatus.PENDING]: 'bg-gray-100 text-gray-600 border border-gray-200',
      [OrderStatus.CONFIRMED]: 'bg-blue-50 text-blue-600 border border-blue-200',
      [OrderStatus.PAID]: 'bg-green-50 text-green-600 border border-green-200',
      [OrderStatus.SHIPPED]: 'bg-purple-50 text-purple-600 border border-purple-200',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${colors[status]}`}>
        {status}
      </span>
    );
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100 m-4">
        <Box className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <h3 className="text-lg font-medium text-gray-900">目前沒有訂單</h3>
        <p className="text-gray-500 text-sm">請在上方貼上 LINE 對話紀錄或啟動監控。</p>
      </div>
    );
  }

  // Sort by timestamp desc (newest first)
  const sortedOrders = [...orders].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">群組</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">買家</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[160px]">商品</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">數量</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">單價</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">狀態</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedOrders.map((order) => {
              const isEditing = editingId === order.id;
              const isMonitor = order.source === 'monitor';
              
              return (
                <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${isMonitor ? 'bg-green-50/20' : ''}`}>
                  {/* Group Name */}
                  <td className="px-4 py-4">
                     {isEditing ? (
                      <select
                        className="border border-gray-300 rounded px-2 py-2 w-full text-sm"
                        value={editForm.groupName}
                        onChange={(e) => setEditForm({...editForm, groupName: e.target.value})}
                      >
                         {GROUP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200 truncate max-w-[80px]" title={order.groupName}>
                        {order.groupName}
                      </span>
                    )}
                  </td>

                  {/* Buyer Name */}
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <input
                        type="text"
                        className="border border-gray-300 rounded px-2 py-2 w-full text-sm"
                        value={editForm.buyerName}
                        onChange={(e) => setEditForm({...editForm, buyerName: e.target.value})}
                      />
                    ) : (
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-600 mr-2">
                          <User size={14} />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-medium text-gray-900 line-clamp-1">{order.buyerName}</span>
                           {isMonitor && <span className="text-[10px] text-green-600 flex items-center">自動監控</span>}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Item Name */}
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <input
                        type="text"
                        className="border border-gray-300 rounded px-2 py-2 w-full text-sm"
                        value={editForm.itemName}
                        onChange={(e) => setEditForm({...editForm, itemName: e.target.value})}
                      />
                    ) : (
                      <div>
                        <div className="text-sm text-gray-900 line-clamp-2">{order.itemName}</div>
                        <div className="text-xs text-gray-400 mt-1 line-clamp-1 opacity-60">{order.rawText}</div>
                      </div>
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="px-4 py-4 text-center">
                     {isEditing ? (
                      <input
                        type="number"
                        className="border border-gray-300 rounded px-2 py-2 w-full text-center text-sm"
                        value={editForm.quantity}
                        onChange={(e) => setEditForm({...editForm, quantity: parseInt(e.target.value) || 0})}
                      />
                    ) : (
                      <span className="inline-block bg-gray-100 rounded px-2 py-1 text-sm font-bold text-gray-700 min-w-[2rem]">
                        {order.quantity}
                      </span>
                    )}
                  </td>

                  {/* Price/Total */}
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    {isEditing ? (
                      <input
                        type="number"
                        className="border border-gray-300 rounded px-2 py-2 w-20 text-sm text-right"
                        value={editForm.price}
                        onChange={(e) => setEditForm({...editForm, price: parseInt(e.target.value) || 0})}
                      />
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">${(order.price * order.quantity).toLocaleString()}</span>
                        <span className="text-xs text-gray-400">@ ${order.price}</span>
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4 text-center">
                    {isEditing ? (
                      <select 
                        className="border border-gray-300 rounded px-2 py-2 text-sm w-full"
                        value={editForm.status}
                        onChange={(e) => setEditForm({...editForm, status: e.target.value as OrderStatus})}
                      >
                         {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <button 
                        onClick={() => {
                          const next = order.status === OrderStatus.PENDING ? OrderStatus.CONFIRMED 
                            : order.status === OrderStatus.CONFIRMED ? OrderStatus.PAID
                            : order.status === OrderStatus.PAID ? OrderStatus.SHIPPED
                            : OrderStatus.PENDING;
                          updateStatus(order.id, next);
                        }}
                        className="focus:outline-none transform active:scale-95 transition-transform"
                      >
                        <StatusBadge status={order.status} />
                      </button>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex items-center justify-end space-x-3">
                        <button onClick={saveEdit} className="bg-green-100 p-1.5 rounded-full text-green-600 hover:bg-green-200"><Check size={18} /></button>
                        <button onClick={cancelEdit} className="bg-red-100 p-1.5 rounded-full text-red-600 hover:bg-red-200"><X size={18} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end space-x-3">
                        <button onClick={() => startEdit(order)} className="text-gray-400 hover:text-indigo-600 p-1"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(order.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={18} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderTable;