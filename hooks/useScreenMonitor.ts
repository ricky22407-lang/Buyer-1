import { useState, useRef, useEffect, useCallback } from 'react';
import { parseChatLogs } from '../services/geminiService';
import { AnalysisResult } from '../types';

interface UseScreenMonitorProps {
  onAnalyzeComplete: (result: AnalysisResult, source: 'monitor', groupName: string) => void;
  productContext: string;
  groupName: string; // Receive current group name
}

export const useScreenMonitor = ({ onAnalyzeComplete, productContext, groupName }: UseScreenMonitorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitorLogs, setMonitorLogs] = useState<string[]>([]);
  const monitorIntervalRef = useRef<number | null>(null);
  const [monitorError, setMonitorError] = useState<string | null>(null);
  
  // Optimization Refs
  const previousFrameData = useRef<Uint8ClampedArray | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  
  // Store groupName in ref to access inside interval without restarting it
  const groupNameRef = useRef(groupName);

  useEffect(() => {
    groupNameRef.current = groupName;
  }, [groupName]);

  const addLog = (msg: string) => {
    setMonitorLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 10)]); 
  };

  // --- Optimization: Pixel Diff Algorithm ---
  const calculateScreenDiff = (ctx: CanvasRenderingContext2D, width: number, height: number): number => {
    const scaledWidth = 50;
    const scaledHeight = 50;
    
    const offCanvas = new OffscreenCanvas(scaledWidth, scaledHeight);
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return 100; 

    offCtx.drawImage(ctx.canvas, 0, 0, width, height, 0, 0, scaledWidth, scaledHeight);
    const currentData = offCtx.getImageData(0, 0, scaledWidth, scaledHeight).data;

    if (!previousFrameData.current) {
      previousFrameData.current = currentData;
      return 100; 
    }

    const prevData = previousFrameData.current;
    let diffPixels = 0;
    const totalPixels = scaledWidth * scaledHeight;

    for (let i = 0; i < currentData.length; i += 4) {
      const rDiff = Math.abs(currentData[i] - prevData[i]);
      const gDiff = Math.abs(currentData[i + 1] - prevData[i + 1]);
      const bDiff = Math.abs(currentData[i + 2] - prevData[i + 2]);
      
      if (rDiff + gDiff + bDiff > 30) {
        diffPixels++;
      }
    }

    previousFrameData.current = currentData;

    return (diffPixels / totalPixels) * 100;
  };

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const changePercent = calculateScreenDiff(ctx, canvas.width, canvas.height);
    
    if (changePercent < 2) {
       return; 
    }

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "screenshot.png", { type: "image/png" });
      
      addLog(`畫面變動 ${changePercent.toFixed(1)}%，正在分析...`);
      try {
        const result = await parseChatLogs([file], productContext);
        
        if (result.orders.length > 0 || result.products.length > 0) {
           // Use Ref for current group name
           onAnalyzeComplete(result, 'monitor', groupNameRef.current);
           if (result.orders.length > 0) addLog(`✅ 發現 ${result.orders.length} 筆新訂單`);
           if (result.products.length > 0) addLog(`🛒 發現 ${result.products.length} 個新品`);
        } else {
           addLog("無新訂單或商品");
        }
        
      } catch (err) {
        addLog("❌ 分析錯誤 (可能是網路問題)");
      }
    }, 'image/png');
  }, [productContext, onAnalyzeComplete]); // Removed groupName from dependency to avoid restart

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        // @ts-ignore
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        addLog("⚡ 螢幕喚醒鎖已啟動 (防止休眠)");
      } catch (err) {
        console.error(`${err}`);
        addLog("⚠️ 無法啟動喚醒鎖，請手動關閉電腦休眠");
      }
    }
  };

  const startMonitoring = async () => {
    try {
      setMonitorError(null);
      previousFrameData.current = null;

      const stream = await navigator.mediaDevices.getDisplayMedia({
        // @ts-ignore
        video: { cursor: "always", frameRate: 5 }, 
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsMonitoring(true);
      await requestWakeLock();
      
      addLog(`已開始監控 (${groupNameRef.current})，每 15 秒掃描...`);

      stream.getVideoTracks()[0].onended = () => {
        stopMonitoring();
      };

      monitorIntervalRef.current = window.setInterval(captureAndAnalyze, 15000); 

    } catch (err) {
      console.error("Error sharing screen:", err);
      setMonitorError("無法啟動監控：請允許瀏覽器分享螢幕權限。");
    }
  };

  const stopMonitoring = useCallback(() => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    if (wakeLockRef.current) {
       wakeLockRef.current.release();
       wakeLockRef.current = null;
    }

    setIsMonitoring(false);
    addLog("監控已停止");
  }, []);

  useEffect(() => {
    return () => {
      if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    isMonitoring,
    monitorLogs,
    monitorError,
    startMonitoring,
    stopMonitoring
  };
};