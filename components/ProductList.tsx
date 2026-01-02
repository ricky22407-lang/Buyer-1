import React, { useState } from 'react';
import { Product, Order, ProductType } from '../types';
import { Tag, Clock, Package, ShoppingCart, CheckCircle, Edit3, Plus, X, Layers } from 'lucide-react';

interface ProductListProps {
  products: Product[];
  orders: Order[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onAddProduct: (product: Omit<Product, 'id' | 'timestamp' | 'purchasedQty' | 'purchaseNotes'>) => void;
}

const ProductList: React.FC<ProductListProps> = ({ products, orders, onUpdateProduct, onAddProduct }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    type: '連線' as ProductType,
    closingTime: '',
    description: '',
    specsStr: '' // New: Comma separated input for manual entry
  });

  // Sort: Connection -> Preorder -> Spot
  const sortedProducts = [...products].sort((a, b) => b.timestamp - a.timestamp);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;

    // Parse specs string into array
    const specs = formData.specsStr 
      ? formData.specsStr.split(/[,，\n]/).map(s => s.trim()).filter(s => s.length > 0)
      : [];

    onAddProduct({
      name: formData.name,
      price: Number(formData.price),
      type: formData.type,
      closingTime: formData.closingTime,
      description: formData.description,
      specs: specs,
      bulkRules: [] // Default empty
    });
    
    // Reset and close
    setFormData({ name: '', price: '', type: '連線', closingTime: '', description: '', specsStr: '' });
    setIsModalOpen(false);
  };

  return (
    <div className="pb-20">
      {/* Header & Actions */}
      <div className="flex justify-between items-center mb-6 px-1">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <Package className="mr-2 text-[#06C755]" />
          商品採購清單
        </h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-lg font-bold shadow-md transition-colors text-sm"
        >
           <Plus size={18} className="mr-1.5" /> 手動上架
        </button>
      </div>

      {/* Empty State */}
      {products.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100 m-4">
          <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">尚未有商品</h3>
          <p className="text-gray-500 text-sm mt-2 px-4">
            點擊右上方「手動上架」按鈕，或透過截圖/對話分析自動匯入。
          </p>
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {sortedProducts.map((product) => {
          // Calculate Total Orders for this product
          const productOrders = orders
            .filter(o => o.itemName.trim() === product.name.trim() || o.itemName.includes(product.name) || product.name.includes(o.itemName));
          
          const totalOrdered = productOrders.reduce((sum, o) => sum + o.quantity, 0);

          // Group by specs if available
          const specCounts: {[key: string]: number} = {};
          if (product.specs && product.specs.length > 0) {
              productOrders.forEach(o => {
                  const specName = o.selectedSpec || '未指定';
                  specCounts[specName] = (specCounts[specName] || 0) + o.quantity;
              });
          }

          const purchased = product.purchasedQty || 0;
          const diff = purchased - totalOrdered;
          const percent = totalOrdered > 0 ? Math.min((purchased / totalOrdered) * 100, 100) : 0;

          return (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              <div className={`h-1.5 w-full ${
                product.type === '連線' ? 'bg-red-500' : 
                product.type === '預購' ? 'bg-indigo-500' : 'bg-green-500'
              }`} />
              
              <div className="p-4 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    product.type === '連線' ? 'bg-red-50 text-red-600' : 
                    product.type === '預購' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {product.type}
                  </span>
                  {product.closingTime && (
                    <span className="flex items-center text-xs text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                      <Clock size={12} className="mr-1" />
                      {product.closingTime.split(' ')[0]}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-gray-800 text-lg mb-1 leading-tight">{product.name}</h3>
                <p className="text-2xl font-bold text-red-600 mb-3">${product.price}</p>
                
                {/* Specs Display */}
                {product.specs && product.specs.length > 0 && (
                   <div className="mb-3 flex flex-wrap gap-1.5">
                      {product.specs.map((spec, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                          {spec}
                          {/* Show count for this spec if > 0 */}
                          {specCounts[spec] ? <span className="ml-1 text-indigo-600 font-bold">x{specCounts[spec]}</span> : ''}
                        </span>
                      ))}
                   </div>
                )}
                
                {/* Purchasing Management Section */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mt-2 space-y-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-bold text-gray-700 flex items-center text-xs">
                        <ShoppingCart size={14} className="mr-1"/> 採購進度
                      </span>
                      <span className={`font-mono font-bold text-xs ${diff < 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {diff < 0 ? `缺 ${Math.abs(diff)}` : diff > 0 ? `多 ${diff}` : '完美'}
                      </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${diff >= 0 ? 'bg-green-500' : 'bg-yellow-400'}`} 
                        style={{ width: `${percent}%` }}
                      ></div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                      <div className="bg-white px-2 py-2 rounded border text-center flex-1">
                        <span className="block text-[10px] text-gray-400 uppercase">客訂需求</span>
                        <span className="block font-bold text-lg text-gray-800 leading-none">{totalOrdered}</span>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-400 mb-0.5 text-center uppercase">目前已買</label>
                        <div className="relative">
                            <input 
                              type="number" 
                              className={`w-full text-center font-bold text-lg rounded border p-1 focus:ring-2 focus:ring-indigo-500 leading-none ${purchased < totalOrdered ? 'text-red-600 border-red-300' : 'text-green-600 border-green-300'}`}
                              value={product.purchasedQty === undefined ? '' : product.purchasedQty}
                              placeholder="0"
                              onChange={(e) => onUpdateProduct(product.id, { purchasedQty: Number(e.target.value) })}
                            />
                            {purchased >= totalOrdered && totalOrdered > 0 && (
                              <CheckCircle size={14} className="absolute top-1.5 right-1.5 text-green-500" />
                            )}
                        </div>
                      </div>
                  </div>

                  {/* Notes Area */}
                  <div className="mt-2">
                      <label className="text-xs text-gray-400 flex items-center mb-1">
                        <Edit3 size={10} className="mr-1"/> 備註
                      </label>
                      <textarea 
                        className="w-full text-sm p-2 border border-gray-200 rounded resize-none focus:ring-1 focus:ring-indigo-300 bg-white"
                        rows={2}
                        placeholder="補貨狀況..."
                        value={product.purchaseNotes || ''}
                        onChange={(e) => onUpdateProduct(product.id, { purchaseNotes: e.target.value })}
                      />
                  </div>
                </div>
              </div>

              {/* Footer / ID */}
              <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-between items-center">
                <span className="text-[10px] text-gray-300">ID: {product.id.slice(0, 4)}</span>
                {product.bulkRules.length > 0 && (
                    <span className="text-[10px] text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full flex items-center">
                      <Tag size={10} className="mr-1" /> 多件優惠
                    </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center">
                   <Plus size={18} className="mr-2 text-[#06C755]" /> 新增商品
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                   <X size={20} />
                </button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">商品名稱 <span className="text-red-500">*</span></label>
                   <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06C755] focus:border-transparent"
                      placeholder="請輸入商品名稱"
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">價格 <span className="text-red-500">*</span></label>
                      <div className="relative">
                         <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                         <input 
                            type="number" 
                            required
                            min="0"
                            value={formData.price}
                            onChange={e => setFormData({...formData, price: e.target.value})}
                            className="w-full pl-7 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06C755]"
                            placeholder="0"
                         />
                      </div>
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">類型</label>
                      <select 
                         value={formData.type}
                         onChange={e => setFormData({...formData, type: e.target.value as ProductType})}
                         className="w-full p-2.5 border border-gray-300 rounded-lg bg-white"
                      >
                         <option value="連線">連線</option>
                         <option value="預購">預購</option>
                         <option value="現貨">現貨</option>
                      </select>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">商品規格 (選填)</label>
                   <input 
                      type="text" 
                      value={formData.specsStr}
                      onChange={e => setFormData({...formData, specsStr: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg"
                      placeholder="例如：紅色, 綠色, S, M (以逗號分隔)"
                   />
                   <p className="text-xs text-gray-400 mt-1">請用逗號分隔不同規格</p>
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">結單時間 (選填)</label>
                   <input 
                      type="text" 
                      value={formData.closingTime}
                      onChange={e => setFormData({...formData, closingTime: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg"
                      placeholder="例：10/25 12:00"
                   />
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">備註/描述 (選填)</label>
                   <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg h-20 resize-none"
                      placeholder="商品描述..."
                   />
                </div>

                <div className="pt-2 flex space-x-3">
                   <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-600 hover:bg-gray-50"
                   >
                      取消
                   </button>
                   <button 
                      type="submit"
                      className="flex-1 py-3 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-lg font-bold shadow-sm"
                   >
                      確認新增
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;