import React, { useState } from 'react';
import { TrendItem } from '../types';
import { searchTrendingItems } from '../services/geminiService';
import { Search, Sparkles, ExternalLink, Plus, Wand2, Globe, Loader2, Tag } from 'lucide-react';

interface TrendDiscoveryProps {
  onAddProduct: (product: any) => void;
  onGenerateCard: (data: { name: string, price: number, description: string }) => void;
}

const COUNTRIES = ['日本', '韓國', '泰國', '中國', '美國', '歐洲'];
const CATEGORIES = ['美妝保養', '零食伴手禮', '服飾包包', '藥妝保健', '居家小物', '母嬰用品', '小眾香氛'];

const TrendDiscovery: React.FC<TrendDiscoveryProps> = ({ onAddProduct, onGenerateCard }) => {
  const [selectedCountry, setSelectedCountry] = useState('日本');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['美妝保養']);
  const [items, setItems] = useState<TrendItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSearch = async () => {
    if (selectedCategories.length === 0) return;
    setIsSearching(true);
    setItems([]); // Clear previous
    try {
      const results = await searchTrendingItems(selectedCountry, selectedCategories);
      setItems(results);
    } catch (e) {
      console.error(e);
      alert('搜尋失敗，請稍後再試。');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="pb-24">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center mb-4">
          <Globe className="text-[#06C755] mr-2" size={24} />
          <h2 className="text-xl font-bold text-gray-800">AI 全網熱門選品</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          AI 自動網羅小紅書、Threads、Dcard、PTT 最新代購話題商品。
        </p>

        {/* Filters */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">1. 選擇國家</label>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCountry(c)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedCountry === c 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">2. 選擇品類 (可複選)</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all flex items-center ${
                    selectedCategories.includes(cat)
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {selectedCategories.includes(cat) && <Tag size={12} className="mr-1" />}
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={isSearching || selectedCategories.length === 0}
            className={`w-full py-3 rounded-xl font-bold text-white shadow-md flex items-center justify-center transition-all mt-4 ${
              isSearching ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
            }`}
          >
            {isSearching ? (
              <>
                <Loader2 className="animate-spin mr-2" />
                AI 正在全網搜索熱門話題...
              </>
            ) : (
              <>
                <Search className="mr-2" />
                開始搜尋熱門商品
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="p-4 flex-1">
              <div className="flex justify-between items-start mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <Sparkles size={10} className="mr-1" />
                  {item.reason}
                </span>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                  {item.sourcePlatform}
                </span>
              </div>
              
              <h3 className="font-bold text-gray-800 text-lg mb-1 leading-tight">{item.name}</h3>
              <p className="text-2xl font-bold text-red-600 mb-2">${item.estimatedPrice}</p>
              <p className="text-sm text-gray-600 line-clamp-3 mb-4">{item.description}</p>
              
              {item.sourceUrl && (
                <a 
                  href={item.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 flex items-center hover:underline mb-4"
                >
                  <ExternalLink size={12} className="mr-1" /> 
                  查看原始來源 ({item.sourcePlatform})
                </a>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex space-x-2">
              <button
                onClick={() => onGenerateCard({
                  name: item.name,
                  price: item.estimatedPrice,
                  description: item.description
                })}
                className="flex-1 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 flex items-center justify-center hover:bg-gray-100"
              >
                <Wand2 size={16} className="mr-1.5" />
                生成圖卡
              </button>
              <button
                onClick={() => onAddProduct({
                  name: item.name,
                  price: item.estimatedPrice,
                  type: '連線',
                  description: item.description,
                  closingTime: '',
                  specs: [],
                  bulkRules: []
                })}
                className="flex-1 py-2 bg-[#06C755] text-white rounded-lg text-sm font-bold flex items-center justify-center hover:bg-[#05b34c]"
              >
                <Plus size={16} className="mr-1.5" />
                直接上架
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && !isSearching && (
        <div className="text-center py-12 text-gray-400">
           <Search size={48} className="mx-auto mb-2 opacity-20" />
           <p>選擇國家與分類後，點擊搜尋按鈕開始挖掘爆款。</p>
        </div>
      )}
    </div>
  );
};

export default TrendDiscovery;