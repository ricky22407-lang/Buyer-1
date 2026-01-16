import React, { useRef, useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Monitor, UploadCloud, X, Play, Square, Eraser, Wand2, AlertTriangle, Settings, Bot, ToggleLeft, ToggleRight, Users, UserCheck } from 'lucide-react';
import { SAMPLE_CHAT_TEXT, GROUP_OPTIONS } from '../constants';

export type InputMode = 'text' | 'image' | 'monitor';

interface InputSectionProps {
  // Input State
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  inputText: string;
  setInputText: (text: string) => void;
  inputImages: File[];
  setInputImages: React.Dispatch<React.SetStateAction<File[]>>;
  
  // Settings State
  productContext: string;
  setProductContext: (text: string) => void;
  groupName: string;
  setGroupName: (name: string) => void;
  sellerName: string;
  setSellerName: (name: string) => void;
  isAiAgentMode: boolean;
  setIsAiAgentMode: (enabled: boolean) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;

  // Processing State
  isProcessing: boolean;
  error: string | null;
  onAnalyze: () => void;
  onClear: () => void;

  // Monitor State
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  monitorLogs: string[];
  monitorError: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

// Sub-component for efficient memory management of thumbnails
const ImageThumbnail: React.FC<{ file: File; onRemove: () => void }> = ({ file, onRemove }) => {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    // Create URL only once when file changes
    const url = URL.createObjectURL(file);
    setSrc(url);

    // Cleanup when component unmounts or file changes
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
      {src && <img src={src} alt="preview" className="w-full h-full object-cover" />}
      <button 
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
      >
        <X size={12} />
      </button>
    </div>
  );
};

const InputSection: React.FC<InputSectionProps> = (props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      props.setInputImages(prev => [...prev, ...newFiles]);
      // Reset value to allow re-uploading the same file if needed (after clearing)
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    props.setInputImages(prev => prev.filter((_, i) => i !== index));
  };

  const loadSample = () => {
    props.setInputMode('text');
    props.setInputText(SAMPLE_CHAT_TEXT.trim() + `
      \n\n老闆娘
      #連線價 $350
      #買3個1000元
      東京芭娜娜蛋糕 (8入)
      #結單 10/25 12:00
      
      Joy
      +3
    `);
  };

  const displayError = props.error || props.monitorError;

  return (
    <div className="space-y-4">
      {/* Settings Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <button 
            onClick={() => props.setShowSettings(!props.showSettings)}
            className="w-full flex justify-between items-center text-gray-700 font-medium hover:text-[#06C755]"
          >
            <span className="flex items-center"><Settings size={18} className="mr-2"/> 連線設定與權限</span>
            <span className="text-xs text-gray-400">{props.showSettings ? '收起' : '展開'}</span>
          </button>
          
          {props.showSettings && (
            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              
              <div className="grid grid-cols-2 gap-3">
                {/* Group Name Setting */}
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1 flex items-center">
                    <Users size={10} className="mr-1" />
                    目標群組
                  </label>
                  <select
                    value={props.groupName}
                    onChange={(e) => props.setGroupName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#06C755] focus:border-transparent bg-white"
                  >
                    {GROUP_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Seller Name Setting */}
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1 flex items-center">
                    <UserCheck size={10} className="mr-1" />
                    賣家帳號名稱
                  </label>
                  <input
                    type="text"
                    value={props.sellerName}
                    onChange={(e) => props.setSellerName(e.target.value)}
                    placeholder="如：老闆娘, 小編A"
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#06C755] focus:border-transparent bg-white"
                  />
                  <p className="text-[9px] text-gray-400 mt-1">* 多人請用逗號隔開 (自動支援本人)</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 mb-1">已上架商品名稱 (用於精準配對)：</p>
                <textarea
                  value={props.productContext}
                  onChange={(e) => props.setProductContext(e.target.value)}
                  placeholder="輸入目前有的商品，AI 會自動將客人的簡稱（如：尺+1）配對到正確商品..."
                  className="w-full h-24 p-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium text-gray-700 flex items-center">
                  <Bot size={16} className="mr-2" /> 
                  開啟 #AI 客服模式
                </span>
                <button 
                  onClick={() => props.setIsAiAgentMode(!props.isAiAgentMode)}
                  className={`transition-colors text-2xl ${props.isAiAgentMode ? 'text-[#06C755]' : 'text-gray-300'}`}
                >
                  {props.isAiAgentMode ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Main Input Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => props.setInputMode('text')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 transition-colors
              ${props.inputMode === 'text' ? 'bg-white text-[#06C755] border-b-2 border-[#06C755]' : 'bg-gray-50 text-gray-500 hover:text-gray-700'}`}
          >
            <FileText size={16} />
            <span>文字</span>
          </button>
          <button
            onClick={() => props.setInputMode('image')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 transition-colors
              ${props.inputMode === 'image' ? 'bg-white text-[#06C755] border-b-2 border-[#06C755]' : 'bg-gray-50 text-gray-500 hover:text-gray-700'}`}
          >
            <ImageIcon size={16} />
            <span>截圖</span>
          </button>
          <button
            onClick={() => props.setInputMode('monitor')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 transition-colors relative
              ${props.inputMode === 'monitor' ? 'bg-white text-red-600 border-b-2 border-red-600' : 'bg-gray-50 text-gray-500 hover:text-gray-700'}`}
          >
            <Monitor size={16} />
            <span>監控</span>
            {props.isMonitoring && (
              <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            )}
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              {props.inputMode === 'text' && '輸入對話紀錄'}
              {props.inputMode === 'image' && '上傳對話截圖'}
              {props.inputMode === 'monitor' && '全自動螢幕監控'}
            </h2>
            {/* Show Current Group Tag hint */}
            <div className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 flex items-center">
               <Users size={12} className="mr-1" />
               {props.groupName}
            </div>
          </div>
          
          {/* TEXT MODE */}
          {props.inputMode === 'text' && (
            <div className="relative">
              <textarea
                value={props.inputText}
                onChange={(e) => props.setInputText(e.target.value)}
                placeholder="請在此貼上 Line 社群的對話紀錄..."
                className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06C755] focus:border-transparent resize-none font-mono text-sm"
              />
              <button 
                  onClick={loadSample}
                  className="absolute bottom-3 right-3 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded transition-colors"
                >
                  載入範例
              </button>
            </div>
          )}

          {/* IMAGE MODE */}
          {props.inputMode === 'image' && (
            <div className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-[#06C755] transition-all h-40"
                >
                  <UploadCloud size={32} className="mb-2" />
                  <span className="text-sm font-medium">點擊上傳截圖</span>
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                />
                
                {props.inputImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {props.inputImages.map((file, idx) => (
                      <ImageThumbnail 
                        key={`${file.name}-${idx}`} 
                        file={file} 
                        onRemove={() => removeImage(idx)} 
                      />
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* MONITOR MODE */}
          <div className={props.inputMode === 'monitor' ? 'space-y-4' : 'hidden'}>
              <div className="bg-black/90 rounded-lg overflow-hidden aspect-video relative flex items-center justify-center border border-gray-800">
                  <video ref={props.videoRef} className="w-full h-full object-contain" muted />
                  {!props.isMonitoring && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <Monitor size={48} className="mb-3 opacity-50" />
                      <p>尚未啟動監控</p>
                      <p className="text-xs text-gray-500 mt-2">目標群組：{props.groupName}</p>
                    </div>
                  )}
                  <canvas ref={props.canvasRef} className="hidden" />
              </div>

              <div className="bg-gray-900 rounded-lg p-3 text-xs font-mono text-green-400 h-32 overflow-y-auto">
                {props.monitorLogs.length === 0 ? (
                  <span className="text-gray-600">等待啟動...</span>
                ) : (
                  props.monitorLogs.map((log, i) => <div key={i}>{log}</div>)
                )}
              </div>
          </div>

          {displayError && (
            <div className="mt-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center">
              <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          <div className="mt-4 flex space-x-3">
            {props.inputMode === 'monitor' ? (
                !props.isMonitoring ? (
                  <button
                  onClick={props.startMonitoring}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md transition-colors flex items-center justify-center"
                  >
                    <Play size={18} className="mr-2" />
                    啟動自動監控
                  </button>
                ) : (
                  <button
                  onClick={props.stopMonitoring}
                  className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-bold shadow-md transition-colors flex items-center justify-center animate-pulse"
                  >
                    <Square size={18} className="mr-2" />
                    停止監控 (運行中)
                  </button>
                )
            ) : (
              <>
                <button
                  onClick={props.onClear}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center justify-center"
                  disabled={props.isProcessing}
                >
                  <Eraser size={18} className="mr-2" />
                  清空
                </button>
                <button
                  onClick={props.onAnalyze}
                  disabled={props.isProcessing || (props.inputMode === 'text' ? !props.inputText.trim() : props.inputImages.length === 0)}
                  className={`flex-1 py-2 px-4 rounded-lg font-bold text-white shadow-md transition-all flex items-center justify-center
                    ${props.isProcessing || (props.inputMode === 'text' ? !props.inputText.trim() : props.inputImages.length === 0) 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-[#06C755] hover:bg-[#05b34c] hover:shadow-lg'}`}
                >
                  {props.isProcessing ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      AI 運算中...
                    </span>
                  ) : (
                    <>
                      <Wand2 size={18} className="mr-2" />
                      開始抓單 / AI 回覆
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputSection;