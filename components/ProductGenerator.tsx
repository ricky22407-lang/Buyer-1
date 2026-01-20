import React, { useState, useRef, useEffect } from 'react';
import { generateProductInfo } from '../services/geminiService';
import { UploadCloud, Download, RefreshCw, DollarSign, Copy, RotateCcw, Plus, Trash, Calendar, Tag, Eraser, X, Share2, Image as ImageIcon, Layers, Sparkles, Calculator } from 'lucide-react';
import { ProductType, BulkRule } from '../types';
// @ts-ignore
import heic2any from 'heic2any';
import { v4 as uuidv4 } from 'uuid';

interface Sticker {
  id: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  type: 'price' | 'spec'; 
}

interface ProductGeneratorProps {
  initialData?: {
    name: string;
    price: number;
    description: string;
  } | null;
}

const ProductGenerator: React.FC<ProductGeneratorProps> = ({ initialData }) => {
  // Image & Canvas
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  
  // Basic Data
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  
  // Pricing & Rate Logic
  const [exchangeRate, setExchangeRate] = useState(() => {
    const saved = localStorage.getItem('linePlusOne_exchangeRate');
    return saved ? parseFloat(saved) : 1.3;
  });
  const [originalPrice, setOriginalPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);

  // New Features: Promotion & Specs
  const [productType, setProductType] = useState<ProductType>('連線');
  const [closingTime, setClosingTime] = useState(''); 
  const [bulkRules, setBulkRules] = useState<BulkRule[]>([]);
  const [specs, setSpecs] = useState<string[]>([]);
  const [newSpec, setNewSpec] = useState('');
  
  // Stickers State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);

  // --- Effects ---

  // Pre-fill data if provided (from Trend Discovery)
  useEffect(() => {
    if (initialData) {
      setProductName(initialData.name);
      setDescription(initialData.description);
      setSellingPrice(initialData.price);
      // Assume initial price is already the selling price estimate
      setOriginalPrice(Math.round(initialData.price / exchangeRate));
    }
  }, [initialData, exchangeRate]);

  // 1. Cleanup Memory on Unmount or Image Change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 2. Save Exchange Rate & Auto Calculate Price
  useEffect(() => {
    localStorage.setItem('linePlusOne_exchangeRate', exchangeRate.toString());
    if (originalPrice > 0) {
      setSellingPrice(Math.ceil(originalPrice * exchangeRate));
    }
  }, [exchangeRate, originalPrice]);

  // --- Date Helpers ---
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const timeOptions = ["12:00", "15:00", "18:00", "20:00", "21:00", "22:00", "23:00", "23:59", "00:00"];
  
  const getClosingDateParts = () => {
    if (!closingTime) {
      const now = new Date();
      return { m: now.getMonth() + 1, d: now.getDate(), t: '23:59' };
    }
    const date = new Date(closingTime);
    return {
      m: date.getMonth() + 1,
      d: date.getDate(),
      t: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    };
  };

  const updateClosingPart = (part: 'm' | 'd' | 't', value: string) => {
     const now = new Date();
     const current = closingTime ? new Date(closingTime) : new Date();
     let year = now.getFullYear();
     let month = current.getMonth();
     let date = current.getDate();
     let hours = current.getHours();
     let mins = current.getMinutes();

     if (!closingTime) {
        month = now.getMonth();
        date = now.getDate();
        hours = 23;
        mins = 59;
     }

     if (part === 'm') month = parseInt(value) - 1;
     if (part === 'd') date = parseInt(value);
     if (part === 't') {
        const [h, m] = value.split(':').map(Number);
        hours = h;
        mins = m;
     }

     const newDate = new Date(year, month, date, hours, mins);
     const isoString = newDate.getFullYear() + '-' +
         String(newDate.getMonth() + 1).padStart(2, '0') + '-' +
         String(newDate.getDate()).padStart(2, '0') + 'T' +
         String(newDate.getHours()).padStart(2, '0') + ':' +
         String(newDate.getMinutes()).padStart(2, '0');

     setClosingTime(isoString);
  };

  const { m: selectedMonth, d: selectedDay, t: selectedTime } = getClosingDateParts();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      
      // Cleanup previous image memory immediately
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      setImageFile(null);
      setPreviewUrl(null);
      setStickers([]);
      setSpecs([]);
      setLoadedImage(null); 
      // Only clear text if it wasn't pre-filled by initialData or user wants to re-analyze
      if (!initialData) {
        setProductName('');
        setDescription('');
      }
      
      e.target.value = '';
      setIsConverting(true);

      try {
        if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
          try {
            const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
            const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
            file = new File([blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
          } catch (e) {
            setIsConverting(false); return;
          }
        }

        setImageFile(file);
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        const img = new Image();
        img.src = objectUrl;
        img.onload = () => { setLoadedImage(img); setIsConverting(false); };
        img.onerror = () => { setIsConverting(false); };

        // Only analyze if we don't have initial data (or if user wants to override)
        // For now, let's analyze only if fields are empty to help user.
        if (!productName) {
            setIsAnalyzing(true);
            try {
              const result = await generateProductInfo(file);
              if (result) {
                setProductName(result.productName);
                setDescription(result.description);
                setOriginalPrice(result.detectedPrice || 0);
              }
            } finally {
              setIsAnalyzing(false);
            }
        }
      } catch (err) { setIsConverting(false); }
    }
  };

  const resetCanvas = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(null);
    setPreviewUrl(null);
    setStickers([]);
    setSpecs([]);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !loadedImage) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    const clickedStickerIndex = stickers.slice().reverse().findIndex(s => {
       if (!s.w || !s.h) return false;
       return (clickX >= s.x - s.w/2 && clickX <= s.x + s.w/2 && clickY >= s.y - s.h/2 && clickY <= s.y + s.h/2);
    });
    if (clickedStickerIndex !== -1) {
      const realIndex = stickers.length - 1 - clickedStickerIndex;
      setStickers(prev => prev.filter((_, i) => i !== realIndex));
    } else {
      setStickers([...stickers, { id: uuidv4(), x: clickX, y: clickY, type: 'price' }]);
    }
  };

  const handleAddSpecSticker = () => {
    if (!loadedImage) return;
    setStickers([...stickers, { id: uuidv4(), x: loadedImage.width / 2, y: loadedImage.height / 2, type: 'spec' }]);
  };

  const addSpec = () => {
    if (newSpec.trim()) {
      setSpecs([...specs, newSpec.trim()]);
      setNewSpec('');
      if (!stickers.some(s => s.type === 'spec') && loadedImage) {
           setTimeout(() => handleAddSpecSticker(), 100);
      }
    }
  };
  const removeSpec = (idx: number) => setSpecs(specs.filter((_, i) => i !== idx));

  const addBulkRule = () => setBulkRules([...bulkRules, { qty: 2, price: sellingPrice * 2 - 50, isUnitPrice: false }]);
  const removeBulkRule = (index: number) => setBulkRules(bulkRules.filter((_, i) => i !== index));
  const updateBulkRule = (index: number, field: keyof BulkRule, value: any) => {
    const newRules = [...bulkRules];
    // @ts-ignore
    newRules[index][field] = value;
    setBulkRules(newRules);
  };

  const generateFullText = () => {
    const priceTag = productType === '連線' ? `#連線價 $${sellingPrice}` 
                   : productType === '預購' ? `#預購價 $${sellingPrice}`
                   : `#現貨 $${sellingPrice}`;

    const bulkTags = bulkRules.map(r => r.isUnitPrice ? `#買${r.qty}個單價${r.price}元` : `#買${r.qty}個${r.price}元`).join('\n');
    let closingTag = '';
    if (closingTime) {
      const date = new Date(closingTime);
      closingTag = `#結單 ${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    const specText = specs.length > 0 ? '📏 規格：\n' + specs.map((s, i) => `${String.fromCharCode(65 + i)}. ${s}`).join('\n') : '';

    return `✨ #上架 ✨

🔥 ${productName}

${description}

💰 ${priceTag}
${specText ? '\n' + specText + '\n' : ''}
${bulkTags ? bulkTags + '\n' : ''}${closingTag ? '⏰ ' + closingTag + '\n' : ''}
🛒 【下單教學】
1. 請針對此商品照片「左滑/長按回覆」
2. 輸入「+1」或「規格+1」 (例如：A+1)`;
  };

  const copyText = () => {
    navigator.clipboard.writeText(generateFullText());
    alert('文案已複製！包含 #上架 標籤');
  };

  const handleShareOrCopy = async () => {
    if (!canvasRef.current) return;
    
    try {
      const blob = await new Promise<Blob | null>(resolve => 
        canvasRef.current?.toBlob(resolve, 'image/png', 1.0)
      );
      
      if (!blob) throw new Error("Canvas is empty");
      const file = new File([blob], "product_card.png", { type: "image/png" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: productName || "商品圖卡",
            text: generateFullText()
          });
          return;
        } catch (err) {
          console.debug("Share cancelled or failed");
        }
      }

      if (navigator.clipboard && window.ClipboardItem) {
        const data = [new ClipboardItem({ 'image/png': blob })];
        await navigator.clipboard.write(data);
        alert("✅ 圖片已成功複製到剪貼簿！\n請直接在 Line 對話框「貼上」即可。");
      } else {
        throw new Error("Clipboard API not supported");
      }
    } catch (err) {
      console.error("Share/Copy failed:", err);
      alert("複製失敗，可能是瀏覽器安全性限制。\n請嘗試使用旁邊的「下載」按鈕，再手動傳送圖片。");
    }
  };

  const downloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${productName || 'product'}.jpg`;
    link.href = canvasRef.current.toDataURL('image/jpeg', 0.9);
    link.click();
  };

  useEffect(() => {
    if (!canvasRef.current || !loadedImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = loadedImage.width;
    canvas.height = loadedImage.height;
    ctx.drawImage(loadedImage, 0, 0);

    stickers.forEach(sticker => {
      const fontSize = Math.max(40, Math.floor(canvas.width * 0.05)); 
      if (sticker.type === 'spec') {
         if (specs.length === 0) return;
         ctx.font = `bold ${fontSize * 0.6}px "Noto Sans TC", sans-serif`;
         let maxWidth = 0;
         const lines = specs.map((s, i) => {
            const line = `${String.fromCharCode(65 + i)}. ${s}`;
            const metrics = ctx.measureText(line);
            if (metrics.width > maxWidth) maxWidth = metrics.width;
            return line;
         });
         const lineHeight = fontSize * 0.8;
         const padding = fontSize * 0.5;
         sticker.w = maxWidth + padding * 2;
         sticker.h = (lines.length * lineHeight) + padding * 2;
         const x = sticker.x - sticker.w/2;
         const y = sticker.y - sticker.h/2;
         ctx.save();
         ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
         ctx.shadowBlur = 10;
         ctx.beginPath(); ctx.roundRect(x, y, sticker.w, sticker.h, 10); ctx.fill();
         ctx.fillStyle = '#374151'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
         lines.forEach((line, i) => ctx.fillText(line, x + padding, y + padding + (i * lineHeight)));
         ctx.restore();
      } else {
          const priceText = `$${sellingPrice}`;
          const typeText = productType === '連線' ? '連線價' : productType === '預購' ? '預購價' : '現貨';
          ctx.font = `bold ${fontSize}px "Noto Sans TC", sans-serif`;
          const pm = ctx.measureText(priceText);
          ctx.font = `bold ${fontSize * 0.5}px "Noto Sans TC", sans-serif`;
          const tm = ctx.measureText(typeText);
          const padding = fontSize * 0.6;
          sticker.w = Math.max(pm.width, tm.width) + padding * 2;
          sticker.h = fontSize * 2;
          const x = sticker.x - sticker.w/2;
          const y = sticker.y - sticker.h/2;
          ctx.save();
          ctx.fillStyle = productType === '連線' ? '#DC2626' : productType === '預購' ? '#4F46E5' : '#059669';
          ctx.shadowBlur = 20;
          ctx.beginPath(); ctx.roundRect(x, y, sticker.w, sticker.h, 20); ctx.fill();
          ctx.fillStyle = 'white'; ctx.textAlign = 'center';
          ctx.font = `bold ${fontSize * 0.5}px "Noto Sans TC", sans-serif`;
          ctx.fillText(typeText, sticker.x, sticker.y - fontSize * 0.2);
          ctx.font = `bold ${fontSize}px "Noto Sans TC", sans-serif`;
          ctx.fillText(priceText, sticker.x, sticker.y + fontSize * 0.6);
          if (closingTime) {
             const date = new Date(closingTime);
             ctx.translate(x + sticker.w - 10, y - 10); ctx.rotate(15 * Math.PI / 180);
             ctx.fillStyle = '#FBBF24'; ctx.beginPath(); ctx.roundRect(0, 0, fontSize * 4, fontSize * 0.8, 10); ctx.fill();
             ctx.fillStyle = '#78350F'; ctx.font = `bold ${fontSize * 0.4}px "Noto Sans TC", sans-serif`;
             ctx.fillText(`結單: ${date.getMonth()+1}/${date.getDate()}`, (fontSize * 4)/2, fontSize * 0.6);
          }
          ctx.restore();
      }
    });
  }, [loadedImage, stickers, sellingPrice, productType, closingTime, specs]);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-8 h-auto lg:h-[calc(100dvh-120px)] overflow-visible lg:overflow-hidden relative">
      {/* Left Column: Image Area */}
      <div className="flex-1 lg:h-full lg:overflow-y-auto bg-gray-50 rounded-xl p-2 lg:p-4 order-1 sticky top-14 lg:static z-20">
        <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg relative min-h-[300px] lg:min-h-[400px] flex items-center justify-center border border-gray-700">
           {!previewUrl ? (
             <div className="text-gray-400 flex flex-col items-center p-8 text-center">
                {isConverting ? (
                  <div className="flex flex-col items-center animate-pulse"><RefreshCw size={64} className="mb-4 text-[#06C755] animate-spin" /><p className="text-lg font-bold text-gray-200">正在處理 HEIC 照片...</p></div>
                ) : (
                  <>
                    <UploadCloud size={48} className="mb-4 text-gray-500" />
                    <label className="mt-2 px-6 py-3 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-full cursor-pointer transition-colors font-bold shadow-lg text-lg">
                      {initialData ? '上傳底圖以合成' : '選擇照片'}
                      <input type="file" onChange={handleImageUpload} className="hidden" accept="image/*, .heic" />
                    </label>
                    {initialData && <p className="mt-4 text-sm text-yellow-400">已載入：{initialData.name}</p>}
                  </>
                )}
             </div>
           ) : (
             <>
                <canvas ref={canvasRef} onClick={handleCanvasClick} className="max-w-full h-auto cursor-crosshair block" />
                <div className="absolute top-4 right-4 flex space-x-2">
                   {stickers.length > 0 && <button onClick={() => setStickers([])} className="bg-black/50 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-sm"><Eraser size={20} /></button>}
                   <button onClick={resetCanvas} className="bg-black/50 hover:bg-white hover:text-black text-white p-2 rounded-full backdrop-blur-sm"><RotateCcw size={20} /></button>
                </div>
             </>
           )}
           {isAnalyzing && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white z-30"><Sparkles className="animate-pulse mr-2"/> AI 正在分析商品內容...</div>}
        </div>
      </div>

      {/* Right Column: Form Area */}
      <div className="flex-1 lg:h-full lg:overflow-y-auto order-2 mt-4 lg:mt-0 pb-32 lg:pb-0">
        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
           <h2 className="text-lg lg:text-xl font-bold text-gray-800 flex items-center border-b pb-4">
             <Tag className="mr-2 text-[#06C755]" />
             商品生成 (自動標記 #上架)
           </h2>

           <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">商品名稱</label>
                <input type="text" value={productName} onChange={e => setProductName(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#06C755]" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">描述 (自動包含下單教學)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 border rounded-lg h-24 text-sm" />
              </div>
           </div>

           {/* Pricing Calculator Section */}
           <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
               <div className="flex space-x-2 mb-4">
                 {(['連線', '預購', '現貨'] as ProductType[]).map(type => (
                   <button key={type} onClick={() => setProductType(type)} className={`flex-1 py-2 text-sm font-bold rounded-lg border ${productType === type ? 'bg-white border-[#06C755] text-[#06C755]' : 'bg-transparent border-gray-300 text-gray-400'}`}>{type}</button>
                 ))}
               </div>

               <div className="grid grid-cols-6 gap-3 items-end">
                   {/* Cost */}
                   <div className="col-span-2">
                      <label className="block text-[10px] text-gray-500 mb-1">成本偵測</label>
                      <input 
                        type="number" 
                        value={originalPrice} 
                        onChange={e => setOriginalPrice(Number(e.target.value))} 
                        className="w-full p-2 bg-white border rounded-md text-sm" 
                      />
                   </div>

                   {/* Exchange Rate (Middle) */}
                   <div className="col-span-2">
                      <label className="block text-[10px] text-gray-500 mb-1 flex items-center text-[#06C755]">
                        <Calculator size={10} className="mr-1" />預設匯率
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={exchangeRate} 
                        onChange={e => setExchangeRate(Number(e.target.value))} 
                        className="w-full p-2 bg-white border border-[#06C755] rounded-md text-sm text-center font-bold text-[#06C755]" 
                      />
                   </div>

                   {/* Selling Price */}
                   <div className="col-span-2">
                       <label className="block text-[10px] font-bold text-red-600 mb-1">對外售價</label>
                       <input 
                        type="number" 
                        value={sellingPrice} 
                        onChange={e => setSellingPrice(Number(e.target.value))} 
                        className="w-full p-2 border-red-200 border-2 rounded-md font-bold text-red-600 text-lg bg-white" 
                       />
                   </div>
               </div>
               <p className="text-[10px] text-gray-400 mt-2 text-center">
                 * 修改「成本」或「匯率」時會自動計算售價 (成本 x 匯率)
               </p>
           </div>
           
           <div className="border-t pt-4">
               <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center"><Layers size={16} className="mr-1" /> 規格 (如: 紅, 綠, S, M)</label>
               <div className="flex gap-2 mb-2">
                  <input type="text" value={newSpec} onChange={e => setNewSpec(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSpec()} className="flex-1 p-2 border rounded-lg text-sm" placeholder="輸入規格按 Enter" />
               </div>
               <div className="flex flex-wrap gap-2">
                  {specs.map((s, idx) => (
                     <span key={idx} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm flex items-center">
                        <span className="font-bold mr-1">{String.fromCharCode(65+idx)}.</span> {s}
                        <button onClick={() => removeSpec(idx)} className="ml-2 hover:text-red-500"><X size={14}/></button>
                     </span>
                  ))}
               </div>
           </div>

           <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center justify-between">
                 <span className="flex items-center"><Calendar size={16} className="mr-1" /> 結單日設定</span>
              </label>
              <div className="flex space-x-2">
                 <select value={closingTime ? selectedMonth : ''} onChange={(e) => updateClosingPart('m', e.target.value)} className="flex-1 p-2.5 bg-white border border-gray-300 rounded-lg text-sm"><option value="" disabled>月</option>{months.map(m => <option key={m} value={m}>{m}月</option>)}</select>
                 <select value={closingTime ? selectedDay : ''} onChange={(e) => updateClosingPart('d', e.target.value)} className="flex-1 p-2.5 bg-white border border-gray-300 rounded-lg text-sm"><option value="" disabled>日</option>{days.map(d => <option key={d} value={d}>{d}日</option>)}</select>
                 <select value={closingTime ? selectedTime : ''} onChange={(e) => updateClosingPart('t', e.target.value)} className="flex-1 p-2.5 bg-white border border-gray-300 rounded-lg text-sm"><option value="" disabled>時間</option>{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select>
              </div>
           </div>

           {/* Actions Bar - Mobile Optimized */}
           <div className="fixed bottom-[64px] left-0 right-0 p-3 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex space-x-2 z-40 lg:static lg:bg-transparent lg:p-0 lg:border-none lg:shadow-none lg:z-auto">
             <button onClick={copyText} className="flex-1 py-3 bg-white border border-gray-300 text-gray-800 rounded-xl font-bold flex items-center justify-center shadow-sm text-sm"><Copy size={18} className="mr-2" /> 複製文案</button>
             <button onClick={handleShareOrCopy} disabled={stickers.length === 0} className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center text-white shadow-md text-sm ${stickers.length === 0 ? 'bg-gray-300' : 'bg-[#06C755] hover:bg-[#05b34c]'}`}><Share2 size={18} className="mr-2" /> 分享圖片</button>
             <button onClick={downloadImage} disabled={stickers.length === 0} className="px-3 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200"><Download size={20} /></button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProductGenerator;