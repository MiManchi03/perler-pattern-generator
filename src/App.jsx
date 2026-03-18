import { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';
import { proImageToPixelGrid } from './utils/proPixelConverter.js';
import ImageUploader from './components/ImageUploader.jsx';
import Controls from './components/Controls.jsx';
import PatternCanvas from './components/PatternCanvas.jsx';
import ColorLegend from './components/ColorLegend.jsx';

function App() {
  const [image, setImage] = useState(null);
  const [pixelData, setPixelData] = useState(null);
  const [settings, setSettings] = useState({
    size: 50,
    colorCount: 16,
    showColorCode: true,
    showRowCol: true,
    showGrid: true
  });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const hiddenCanvasRef = useRef(null);

  // 处理图片上传
  const handleImageUpload = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        processImage(img, settings);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, [settings]);

  // 处理图片转换
  const processImage = useCallback((img, currentSettings) => {
    setIsProcessing(true);
    
    // 使用隐藏 canvas 处理图片
    const canvas = hiddenCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 直接使用原图尺寸，不再缩放
    // 这样可以保留所有细节，算法内部会在targetSize上进行格子划分
    canvas.width = img.width;
    canvas.height = img.height;
    
    // 绘制原图
    ctx.drawImage(img, 0, 0);
    
    // 获取像素数据并转换
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // 使用当前设置的尺寸作为目标尺寸
    const targetSize = currentSettings.size;
    const result = proImageToPixelGrid(imageData, img.width, img.height, currentSettings.colorCount, targetSize);
    
    setPixelData(result);
    setIsProcessing(false);
  }, []);

  // 防抖处理
  const debounceTimeout = useRef(null);

  // 设置变更时重新处理
  const handleSettingsChange = useCallback((newSettings) => {
    setSettings(newSettings);
    if (image) {
      // 清除之前的防抖定时器
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      // 设置新的防抖定时器，300ms后处理图片
      debounceTimeout.current = setTimeout(() => {
        processImage(image, newSettings);
      }, 300);
    }
  }, [image, processImage]);

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  // 下载图纸
  const handleDownload = useCallback(() => {
    const canvas = document.getElementById('pattern-canvas');
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = '拼豆图纸.png';
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>🔷 拼豆图纸生成工具</h1>
        <p>上传照片，一键生成拼豆像素图纸 - 完全免费，无需注册</p>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <ImageUploader onUpload={handleImageUpload} image={image} />
          
          <Controls 
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onDownload={handleDownload}
            canDownload={!!pixelData}
          />
          
          {pixelData && (
            <div className="stats">
              <div className="stat-item">
                <div className="stat-value">{pixelData.grid[0]?.length || 0}</div>
                <div className="stat-label">宽度 (格)</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{pixelData.grid.length}</div>
                <div className="stat-label">高度 (格)</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{pixelData.colors.size}</div>
                <div className="stat-label">颜色数</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {Array.from(pixelData.colors.values())
                    .reduce((sum, c) => sum + c.count, 0)}
                </div>
                <div className="stat-label">总豆数</div>
              </div>
            </div>
          )}
        </aside>

        <main>
          <div className="canvas-container">
            {isProcessing ? (
              <div className="loading">🔄 正在生成图纸...</div>
            ) : pixelData ? (
              <PatternCanvas 
                pixelData={pixelData}
                settings={settings}
              />
            ) : (
              <div className="loading">
                📷 请上传图片开始生成拼豆图纸
              </div>
            )}
          </div>

          {pixelData && (
            <ColorLegend colors={pixelData.colors} />
          )}
        </main>
      </div>

      {/* 隐藏的 canvas 用于图片处理 */}
      <canvas ref={hiddenCanvasRef} className="hidden-canvas" />
    </div>
  );
}

export default App;