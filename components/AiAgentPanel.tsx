import React from 'react';
import { AiInteraction } from '../types';
import { Bot, Copy, MessageCircle } from 'lucide-react';

interface AiAgentPanelProps {
  interactions: AiInteraction[];
  onClear: () => void;
}

const AiAgentPanel: React.FC<AiAgentPanelProps> = ({ interactions, onClear }) => {
  if (interactions.length === 0) return null;

  const copyReply = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    // Visual feedback could be added here
    const btn = document.getElementById(`btn-${id}`);
    if (btn) btn.innerText = "已複製！";
    setTimeout(() => {
      if (btn) btn.innerText = "複製回覆";
    }, 2000);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 mb-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center text-indigo-700 font-bold">
          <Bot className="mr-2" size={24} />
          <span>AI 智能客服建議</span>
          <span className="ml-2 bg-indigo-200 text-indigo-800 text-xs px-2 py-0.5 rounded-full">
            Agent Mode
          </span>
        </div>
        <button 
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          清除列表
        </button>
      </div>

      <div className="space-y-3">
        {interactions.map((item) => (
          <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm border border-indigo-100 flex flex-col md:flex-row gap-4">
            {/* Question Part */}
            <div className="flex-1">
              <div className="flex items-center text-xs text-gray-500 mb-1">
                <MessageCircle size={12} className="mr-1" />
                來自：{item.buyerName}
              </div>
              <p className="text-gray-800 font-medium text-sm bg-gray-50 p-2 rounded block">
                {item.question}
              </p>
            </div>

            {/* Answer Part */}
            <div className="flex-1 border-l-2 border-indigo-100 pl-4 md:pl-0 md:border-l-0">
               <div className="flex items-center text-xs text-indigo-500 mb-1 font-bold">
                <Bot size={12} className="mr-1" />
                AI 建議回覆：
              </div>
              <p className="text-indigo-900 text-sm mb-2 leading-relaxed">
                {item.suggestedReply}
              </p>
              <button
                id={`btn-${item.id}`}
                onClick={() => copyReply(item.suggestedReply, item.id)}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-colors flex items-center justify-center"
              >
                <Copy size={12} className="mr-1" />
                複製回覆
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AiAgentPanel;