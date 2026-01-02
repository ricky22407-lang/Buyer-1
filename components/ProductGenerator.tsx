import React, { useState, useRef, useEffect } from 'react';
import { generateProductInfo } from '../services/geminiService';
import { UploadCloud, Download, RefreshCw, DollarSign, Copy, RotateCcw, Plus, Trash, Calendar, Tag, Eraser, X, Share2, Image as ImageIcon, Layers } from 'lucide-react';
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
  type: 'price' | 'spec'; // Differentiate types
}

const ProductGenerator: React.FC = () => {
  // Image & Canvas
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  
  // Basic Data
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(1.1);
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


  // --- Handlers ---

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      setImageFile(null);
      setPreviewUrl(null);
      setStickers([]);
      setSpecs([]);
      setLoadedImage(null); 
      setProductName('');
      setDescription('');
      
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

        setIsAnalyzing(true);
        try {
          const result = await generateProductInfo(file);
          if (result) {
            setProductName(result.productName);
            setDescription(result.description);
            setOriginalPrice(result.detectedPrice || 0);
            setSellingPrice(Math.ceil((result.detectedPrice || 0) * exchangeRate));
          }
        } finally {
          setIsAnalyzing(false);
        }
      } catch (err) { setIsConverting(false); }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !loadedImage) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Hit Detection
    const clickedStickerIndex = stickers.slice().reverse().findIndex(s => {
       if (!s.w || !s.h) return false;
       const halfW = s.w / 2;
       const halfH = s.h / 2;
       return (clickX >= s.x - halfW && clickX <= s.x + halfW && clickY >= s.y - halfH && clickY <= s.y + halfH);
    });

    if (clickedStickerIndex !== -1) {
      const realIndex = stickers.length - 1 - clickedStickerIndex;
      const newStickers = [...stickers];
      newStickers.splice(realIndex, 1);
      setStickers(newStickers);
    } else {
      // Default add price sticker on click
      setStickers([...stickers, { id: uuidv4(), x: clickX, y: clickY, type: 'price' }]);
    }
  };

  const handleAddSpecSticker = () => {
    if (!loadedImage) return;
    // Add to center
    setStickers([...stickers, { 
      id: uuidv4(), 
      x: loadedImage.width / 2, 
      y: loadedImage.height / 2, 
      type: 'spec' 
    }]);
  };

  // --- Specs Logic ---
  const addSpec = () => {
    if (newSpec.trim()) {
      const updatedSpecs = [...specs, newSpec.trim()];
      setSpecs(updatedSpecs);
      setNewSpec('');
      
      // Auto-add spec sticker if not present
      if (!stickers.some(s => s.type === 'spec')) {
        // We can't access updated state immediately here, so checking stickers is fine.
        // We'll rely on the user to click "Add Sticker" or trigger it. 
        // Actually, let's trigger it if image is loaded.
        if (loadedImage) {
           setTimeout(() => handleAddSpecSticker(), 100);
        }
      }
    }
  };
  const removeSpec = (idx: number) => {
    setSpecs(specs.filter((_, i) => i !== idx));
  };

  // --- Bulk Rules Logic ---
  const addBulkRule = () => {
    setBulkRules([...bulkRules, { qty: 2, price: sellingPrice * 2 - 50, isUnitPrice: false }]);
  };
  const removeBulkRule = (index: number) => {
    setBulkRules(bulkRules.filter((_, i) => i !== index));
  };
  const updateBulkRule = (index: number, field: keyof BulkRule, value: any) => {
    const newRules = [...bulkRules];
    // @ts-ignore
    newRules[index][field] = value;
    setBulkRules(newRules);
  };

  // --- Text Generation ---
  const generateFullText = () => {
    const priceTag = productType === '連線' ? `#連線價 $${sellingPrice}` 
                   : productType === '預購' ? `#預購價 $${sellingPrice}`
                   : `#現貨 $${sellingPrice}`;

    const bulkTags = bulkRules.map(r => {
      if (r.isUnitPrice) return `#買${r.qty}個單價${r.price}元`;
      return `#買${r.qty}個${r.price}元`;
    }).join('\n');

    let closingTag = '';
    if (closingTime) {
      const date = new Date(closingTime);
      const formatted = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      closingTag = `#結單 ${formatted}`;
    }

    let specText = '';
    if (specs.length > 0) {
      specText = '📏 規格：\n' + specs.map((s, i) => `${String.fromCharCode(65 + i)}. ${s}`).join('\n');
    }

    const tutorialText = `🛒 【下單教學】
1. 請針對此商品照片「左滑/長按回覆」
2. 輸入「+1」或「規格+1」 (例如：A+1)
3. 取消請回覆「取消」或「-1」`;

    return `🔥 ${productName}

${description}

💰 ${priceTag}
${specText ? '\n' + specText + '\n' : ''}
${bulkTags ? bulkTags + '\n' : ''}${closingTag ? '⏰ ' + closingTag + '\n' : ''}
${tutorialText}`;
  };

  const copyText = () => {
    navigator.clipboard.writeText(generateFullText());
    alert('文案已複製！包含 AI 辨識用的規格與價格');
  };

  const handleShareOrCopy = async () => {
    if (!canvasRef.current) return;
    const blob = await new Promise<Blob | null>(resolve => canvasRef.current?.toBlob(resolve, 'image/png', 1.0));
    if (!blob) { alert("圖片生成失敗"); return; }

    const file = new File([blob], "product_card.png", { type: "image/png" });
    const text = generateFullText();

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: productName || '商品圖卡', text: text });
        return;
      } catch (err) { /* ignore abort */ return; }
    }

    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert("✅ 圖片已複製！請直接貼上 Line (Ctrl+V)");
    } catch (err) { alert("複製失敗，請使用下載按鈕"); }
  };

  const downloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${productName || 'product'}_price_card.jpg`;
    link.href = canvasRef.current.toDataURL('image/jpeg', 0.9);
    link.click();
  };

  // --- Canvas Rendering ---
  useEffect(() => {
    if (!canvasRef.current || !loadedImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = loadedImage.width;
    canvas.height = loadedImage.height;
    ctx.drawImage(loadedImage, 0, 0);

    const updatedStickers = stickers.map(sticker => {
      const fontSize = Math.max(40, Math.floor(canvas.width * 0.05)); 
      
      // Calculate Content based on Type
      if (sticker.type === 'spec') {
         if (specs.length === 0) { sticker.w = 0; sticker.h = 0; return sticker; }
         
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
         const w = maxWidth + padding * 2;
         const h = (lines.length * lineHeight) + padding * 2;

         sticker.w = w;
         sticker.h = h;
         const x = sticker.x - w/2;
         const y = sticker.y - h/2;

         // Draw Spec Box
         ctx.save();
         ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
         ctx.shadowColor = 'rgba(0,0,0,0.3)';
         ctx.shadowBlur = 10;
         ctx.beginPath();
         ctx.roundRect(x, y, w, h, 10);
         ctx.fill();
         
         ctx.fillStyle = '#374151'; // Gray 700
         ctx.textAlign = 'left';
         ctx.textBaseline = 'top';
         lines.forEach((line, i) => {
            ctx.fillText(line, x + padding, y + padding + (i * lineHeight));
         });
         ctx.restore();

      } else {
          // Price Sticker
          const priceText = `$${sellingPrice}`;
          const typeText = productType === '連線' ? '連線價' : productType === '預購' ? '預購價' : '現貨';
          
          ctx.font = `bold ${fontSize}px "Noto Sans TC", sans-serif`;
          const priceMetrics = ctx.measureText(priceText);
          ctx.font = `bold ${fontSize * 0.5}px "Noto Sans TC", sans-serif`;
          const typeMetrics = ctx.measureText(typeText);
          
          const padding = fontSize * 0.6;
          const w = Math.max(priceMetrics.width, typeMetrics.width) + padding * 2;
          const h = fontSize * 2;
          
          sticker.w = w;
          sticker.h = h;

          const x = sticker.x - w/2;
          const y = sticker.y - h/2;
          const r = 20;

          // Draw Pill
          ctx.save();
          ctx.fillStyle = productType === '連線' ? '#DC2626' : productType === '預購' ? '#4F46E5' : '#059669';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, r);
          ctx.fill();
          
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.font = `bold ${fontSize * 0.5}px "Noto Sans TC", sans-serif`;
          ctx.fillText(typeText, sticker.x, sticker.y - fontSize * 0.2);
          ctx.font = `bold ${fontSize}px "Noto Sans TC", sans-serif`;
          ctx.fillText(priceText, sticker.x, sticker.y + fontSize * 0.6);

          // Draw Closing Time Badge if it exists
          if (closingTime) {
             const date = new Date(closingTime);
             const closeText = `結單: ${date.getMonth()+1}/${date.getDate()}`;
             ctx.translate(x + w - 10, y - 10);
             ctx.rotate(15 * Math.PI / 180);
             ctx.fillStyle = '#FBBF24';
             ctx.beginPath();
             ctx.roundRect(0, 0, fontSize * 4, fontSize * 0.8, 10);
             ctx.fill();
             ctx.fillStyle = '#78350F';
             ctx.font = `bold ${fontSize * 0.4}px "Noto Sans TC", sans-serif`;
             ctx.fillText(closeText, (fontSize * 4)/2, (fontSize * 0.8)/2 + fontSize * 0.4); // manual adjust baseline
          }
          ctx.restore();
      }
      return sticker;
    });
    
  }, [loadedImage, stickers, sellingPrice, productType, closingTime, specs]);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-8 h-[calc(100dvh-120px)] overflow-hidden">
      
      {/* 1. Canvas Area */}
      <div className="flex-1 lg:h-full overflow-y-auto bg-gray-50 rounded-xl p-2 lg:p-4 order-1">
        <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg relative min-h-[300px] lg:min-h-[400px] flex items-center justify-center border border-gray-700">
           {!previewUrl ? (
             <div className="text-gray-400 flex flex-col items-center p-8 text-center">
                {isConverting ? (
                  <div className="flex flex-col items-center animate-pulse"><RefreshCw size={64} className="mb-4 text-[#06C755] animate-spin" /><p className="text-lg font-bold text-gray-200">正在處理 HEIC 照片...</p></div>
                ) : (
                  <>
                    <UploadCloud size={48} className="mb-4 text-gray-500" />
                    <label className="mt-2 px-6 py-3 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-full cursor-pointer transition-colors font-bold shadow-lg text-lg">
                      選擇照片
                      <input type="file" onChange={handleImageUpload} className="hidden" accept="image/*, .heic" />
                    </label>
                  </>
                )}
             </div>
           ) : (
             <>
                <canvas ref={canvasRef} onClick={handleCanvasClick} className="max-w-full h-auto cursor-crosshair block" />
                <div className="absolute top-4 right-4 flex space-x-2">
                   {stickers.length > 0 && <button onClick={() => setStickers([])} className="bg-black/50 hover:bg-red-600 text-white p-2 rounded-full transition-colors backdrop-blur-sm"><Eraser size={20} /></button>}
                   <button onClick={() => { setImageFile(null); setPreviewUrl(null); setStickers([]); setSpecs([]); }} className="bg-black/50 hover:bg-white hover:text-black text-white p-2 rounded-full transition-colors backdrop-blur-sm"><RotateCcw size={20} /></button>
                </div>
                {stickers.length === 0 && <div className="absolute bottom-4 bg-black/60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm pointer-events-none">👆 點擊圖片貼上價格</div>}
             </>
           )}
           {isAnalyzing && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white z-30"><RefreshCw className="animate-spin mr-2"/> AI 分析中...</div>}
        </div>
      </div>

      {/* 2. Controls Area */}
      <div className="flex-1 lg:h-full overflow-y-auto order-2 mt-4 lg:mt-0 pb-20 lg:pb-0">
        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
           <h2 className="text-lg lg:text-xl font-bold text-gray-800 flex items-center border-b pb-4">
             <DollarSign className="mr-2 text-[#06C755]" />
             商品與規格設定
           </h2>

           <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">商品名稱</label>
                <input type="text" value={productName} onChange={e => setProductName(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#06C755]" placeholder="例如：日本限定餅乾" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">推坑文案</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 border rounded-lg h-24 text-sm" placeholder="AI 會自動產生..." />
              </div>
           </div>

           {/* Pricing & Type */}
           <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
               <div className="col-span-2">
                  <div className="flex space-x-2">
                     {(['連線', '預購', '現貨'] as ProductType[]).map(type => (
                       <button key={type} onClick={() => setProductType(type)} className={`flex-1 py-2.5 text-sm font-bold rounded-lg border ${productType === type ? (type === '連線' ? 'bg-red-50 border-red-500 text-red-600' : type === '預購' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-green-50 border-green-500 text-green-600') : 'bg-white border-gray-300 text-gray-500'}`}>{type}</button>
                     ))}
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">偵測原價</label>
                  <input type="number" value={originalPrice} onChange={e => setOriginalPrice(Number(e.target.value))} className="w-full p-2 bg-white border rounded-md text-gray-500" />
               </div>
               <div>
                   <label className="block text-xs font-bold text-red-600 mb-1">單件售價</label>
                   <input type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="w-full p-2 border-red-200 border-2 rounded-md font-bold text-red-600 text-lg" />
               </div>
           </div>
           
           {/* SPECS SECTION */}
           <div className="border-t pt-4">
               <div className="flex justify-between items-center mb-2">
                 <label className="block text-sm font-bold text-gray-700 flex items-center"><Layers size={16} className="mr-1" /> 商品規格 (顏色/尺寸)</label>
                 {specs.length > 0 && !stickers.some(s => s.type === 'spec') && (
                    <button onClick={handleAddSpecSticker} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100">
                       + 貼到圖片
                    </button>
                 )}
               </div>
               <div className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    value={newSpec} 
                    onChange={e => setNewSpec(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && addSpec()}
                    placeholder="輸入規格 (如：紅色、S號)" 
                    className="flex-1 p-2 border rounded-lg text-sm"
                  />
                  <button onClick={addSpec} className="px-3 bg-gray-100 hover:bg-gray-200 rounded-lg"><Plus size={18} /></button>
               </div>
               <div className="flex flex-wrap gap-2">
                  {specs.map((s, idx) => (
                     <span key={idx} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm flex items-center">
                        <span className="font-bold mr-1">{String.fromCharCode(65+idx)}.</span> {s}
                        <button onClick={() => removeSpec(idx)} className="ml-2 text-indigo-400 hover:text-red-500"><X size={14}/></button>
                     </span>
                  ))}
               </div>
           </div>

           {/* Closing Time */}
           <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center justify-between">
                 <span className="flex items-center"><Calendar size={16} className="mr-1" /> 結單時間</span>
                 {closingTime && <button onClick={() => setClosingTime('')} className="text-xs text-red-500 flex items-center hover:underline"><X size={12} className="mr-1"/> 清除</button>}
              </label>
              <div className="flex space-x-2">
                 <select value={closingTime ? selectedMonth : ''} onChange={(e) => updateClosingPart('m', e.target.value)} className="flex-1 p-2.5 bg-white border border-gray-300 rounded-lg text-sm"><option value="" disabled>月</option>{months.map(m => <option key={m} value={m}>{m}月</option>)}</select>
                 <select value={closingTime ? selectedDay : ''} onChange={(e) => updateClosingPart('d', e.target.value)} className="flex-1 p-2.5 bg-white border border-gray-300 rounded-lg text-sm"><option value="" disabled>日</option>{days.map(d => <option key={d} value={d}>{d}日</option>)}</select>
                 <select value={closingTime ? selectedTime : ''} onChange={(e) => updateClosingPart('t', e.target.value)} className="flex-1 p-2.5 bg-white border border-gray-300 rounded-lg text-sm"><option value="" disabled>時間</option>{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select>
              </div>
           </div>

           {/* Bulk */}
           <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                 <label className="block text-sm font-bold text-gray-700 flex items-center"><Tag size={16} className="mr-1" /> 多件優惠</label>
                 <button onClick={addBulkRule} className="text-xs flex items-center bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-gray-700 font-medium"><Plus size={14} className="mr-1"/> 新增</button>
              </div>
              <div className="space-y-2">
                 {bulkRules.map((rule, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-yellow-50 p-2 rounded-lg border border-yellow-100">
                       <span className="text-sm font-bold text-gray-600">買</span>
                       <input type="number" value={rule.qty} onChange={(e) => updateBulkRule(idx, 'qty', Number(e.target.value))} className="w-12 p-1 border rounded text-center"/>
                       <span className="text-sm font-bold text-gray-600">個</span>
                       <select value={rule.isUnitPrice ? 'unit' : 'total'} onChange={(e) => updateBulkRule(idx, 'isUnitPrice', e.target.value === 'unit')} className="p-1 border rounded text-xs bg-white"><option value="total">總共</option><option value="unit">單價</option></select>
                       <span className="text-sm font-bold text-gray-600">$</span>
                       <input type="number" value={rule.price} onChange={(e) => updateBulkRule(idx, 'price', Number(e.target.value))} className="w-16 p-1 border rounded font-bold text-red-500"/>
                       <button onClick={() => removeBulkRule(idx)} className="text-gray-400 hover:text-red-500 ml-auto p-2"><Trash size={16} /></button>
                    </div>
                 ))}
              </div>
           </div>

           {/* Actions */}
           <div className="pt-4 border-t flex space-x-2 fixed bottom-0 left-0 right-0 bg-white p-4 lg:relative lg:bg-transparent lg:p-0 border-t-gray-200 lg:border-t-0 shadow-inner lg:shadow-none z-10">
             <button onClick={copyText} className="flex-1 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-xl font-bold flex items-center justify-center shadow-sm text-sm lg:text-base"><Copy size={18} className="mr-2" /> 複製文案</button>
             <button onClick={handleShareOrCopy} disabled={stickers.length === 0} className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center text-white shadow-md text-sm lg:text-base ${stickers.length === 0 ? 'bg-gray-300' : 'bg-[#06C755] hover:bg-[#05b34c]'}`}><Share2 size={18} className="mr-2" /> <span className="hidden sm:inline">複製圖片/分享</span><span className="sm:hidden">分享</span></button>
             <button onClick={downloadImage} disabled={stickers.length === 0} className="px-3 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"><Download size={20} /></button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProductGenerator;