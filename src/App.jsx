import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import './App.css';
import { proImageToPixelGrid } from './utils/proPixelConverter.js';
import { 
  getUniqueColors, 
  rgbToHex, 
  generateShades, 
  sortColorsByRgb, 
  generateRainbowGradient,
  getContrastColor,
  isColorEqual
} from './utils/ColorUtils.js';
import ImageUploader from './components/ImageUploader.jsx';
import Controls from './components/Controls.jsx';
import PatternCanvas from './components/PatternCanvas.jsx';
import ColorLegend from './components/ColorLegend.jsx';
import ColorBubble from './components/ColorBubble.jsx';

const MAX_HISTORY = 50;

function App() {
  const [image, setImage] = useState(null);
  const [pixelData, setPixelData] = useState(null);
  const [originalGrid, setOriginalGrid] = useState(null); // 保存原始格子数据
  const [settings, setSettings] = useState({
    size: 50,
    showColorCode: true,
    showRowCol: true,
    showGrid: true
  });
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 自定义颜色功能状态
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null); // {x, y}
  const [showBubble, setShowBubble] = useState(false);
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 }); // 气泡位置
  const [modifiedColors, setModifiedColors] = useState(new Map()); // "x,y" → rgb
  const [history, setHistory] = useState([]); // [{key, oldColor, newColor}]
  const [visibleColorCount, setVisibleColorCount] = useState(20); // 分页显示
  
  const hiddenCanvasRef = useRef(null);

  // 获取所有唯一颜色
  const allUniqueColors = useMemo(() => {
    if (!pixelData) return [];
    return getUniqueColors(pixelData.grid);
  }, [pixelData]);

  // 获取选中格子的原始颜色
  const selectedCellOriginalColor = useMemo(() => {
    if (!selectedCell || !originalGrid) return null;
    const { x, y } = selectedCell;
    const cell = originalGrid[y]?.[x];
    return cell?.rgb || null;
  }, [selectedCell, originalGrid]);

  // 获取选中格子的颜色编号
  const selectedCellId = useMemo(() => {
    if (!selectedCell || !originalGrid) return '';
    const { x, y } = selectedCell;
    const cell = originalGrid[y]?.[x];
    return cell?.id || '';
  }, [selectedCell, originalGrid]);

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
    
    const canvas = hiddenCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = img.width;
    canvas.height = img.height;
    
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const targetSize = currentSettings.size;
    const result = proImageToPixelGrid(imageData, img.width, img.height, targetSize);
    
    // 保存原始格子数据
    setOriginalGrid(JSON.parse(JSON.stringify(result.grid)));
    setPixelData(result);
    
    // 重置修改状态
    setModifiedColors(new Map());
    setHistory([]);
    setVisibleColorCount(20);
    
    setIsProcessing(false);
  }, []);

  // 防抖处理
  const debounceTimeout = useRef(null);

  // 设置变更时重新处理
  const handleSettingsChange = useCallback((newSettings) => {
    setSettings(newSettings);
    if (image) {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
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

  // 进入/退出编辑模式
  const toggleEditMode = useCallback(() => {
    if (isEditMode) {
      // 退出编辑模式
      setIsEditMode(false);
      setShowBubble(false);
      setSelectedCell(null);
    } else {
      // 进入编辑模式
      setIsEditMode(true);
    }
  }, [isEditMode]);

  // 点击格子
  const handleCellClick = useCallback((x, y, clientX, clientY) => {
    if (!isEditMode) return;
    setSelectedCell({ x, y });
    setBubblePosition({ x: clientX, y: clientY });
    setShowBubble(true);
  }, [isEditMode]);

  // 确认颜色修改
  const handleColorConfirm = useCallback((newColor) => {
    if (!selectedCell) return;

    const key = `${selectedCell.x},${selectedCell.y}`;
    const oldColor = selectedCellOriginalColor;

    const newHistory = [...history, { key, oldColor, newColor }].slice(-MAX_HISTORY);
    setHistory(newHistory);

    const newModified = new Map(modifiedColors);
    newModified.set(key, newColor);
    setModifiedColors(newModified);

    setShowBubble(false);
    setSelectedCell(null);
  }, [selectedCell, selectedCellOriginalColor, modifiedColors, history]);

  // 取消修改
  const handleColorCancel = useCallback(() => {
    setShowBubble(false);
    setSelectedCell(null);
  }, []);

  // 撤销
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const lastChange = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    const newModified = new Map(modifiedColors);

    if (lastChange.oldColor) {
      newModified.set(lastChange.key, lastChange.oldColor);
    } else {
      newModified.delete(lastChange.key);
    }

    setHistory(newHistory);
    setModifiedColors(newModified);
  }, [history, modifiedColors]);

  // 重置所有修改
  const handleReset = useCallback(() => {
    if (modifiedColors.size === 0) return;

    setModifiedColors(new Map());
    setHistory([]);
    setShowBubble(false);
    setSelectedCell(null);
  }, [modifiedColors.size]);

  // 保存修改（不退出编辑模式）
  const handleSave = useCallback(() => {
    if (modifiedColors.size === 0) return;
    
    // 显示保存成功提示
    alert(`已保存 ${modifiedColors.size} 个格子的颜色修改`);
    
    // 这里可以添加其他保存逻辑，比如保存到本地存储
    // 但保持编辑模式不变，不退出编辑
  }, [modifiedColors.size]);

  // 加载修改
  const handleLoad = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          
          if (!data.modifications) {
            alert('无效的文件格式');
            return;
          }
          
          // 应用修改
          const newModified = new Map();
          for (const [key, rgb] of Object.entries(data.modifications)) {
            newModified.set(key, rgb);
          }
          
          setModifiedColors(newModified);
          setHistory([]);
        } catch (error) {
          alert('读取文件失败: ' + error.message);
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  }, []);

  // 展示更多颜色
  const handleShowMore = useCallback(() => {
    setVisibleColorCount(prev => prev + 20);
  }, []);

  // 获取格子颜色（考虑修改）
  const getCellColor = useCallback((cell, x, y) => {
    const key = `${x},${y}`;
    if (modifiedColors.has(key)) {
      return modifiedColors.get(key);
    }
    if (originalGrid && originalGrid[y]?.[x]) {
      return originalGrid[y][x].rgb;
    }
    return cell?.rgb || null;
  }, [modifiedColors, originalGrid]);

  // 统计数据（考虑修改后的颜色数量）
  const colorCount = useMemo(() => {
    const uniqueColors = new Set();
    for (let y = 0; y < (pixelData?.grid.length || 0); y++) {
      for (let x = 0; x < (pixelData?.grid[y]?.length || 0); x++) {
        const color = getCellColor(pixelData.grid[y][x], x, y);
        if (color) {
          uniqueColors.add(color.join(','));
        }
      }
    }
    return uniqueColors.size;
  }, [pixelData, getCellColor]);

  return (
    <div className="app">
      <header className="header">
        <h1>🔷 拼豆图纸生成工具 (给桑桑做的❤) 🔷</h1>
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
            isEditMode={isEditMode}
            onToggleEditMode={toggleEditMode}
            onUndo={handleUndo}
            canUndo={history.length > 0}
            onReset={handleReset}
            canReset={modifiedColors.size > 0}
            onSave={handleSave}
            canSave={modifiedColors.size > 0}
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
                <div className="stat-value">{colorCount}</div>
                <div className="stat-label">颜色数</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {pixelData.grid.length * pixelData.grid[0].length}
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
                isEditMode={isEditMode}
                onCellClick={handleCellClick}
                getCellColor={getCellColor}
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

      {/* 颜色选择气泡 */}
      <ColorBubble
        visible={showBubble}
        originalColor={selectedCellOriginalColor}
        allColors={allUniqueColors}
        onConfirm={handleColorConfirm}
        onCancel={handleColorCancel}
        onShowMore={handleShowMore}
        visibleCount={visibleColorCount}
        totalCount={allUniqueColors.length}
        position={bubblePosition}
        selectedCell={selectedCell}
        cellId={selectedCellId}
        currentColor={selectedCellOriginalColor}
      />

      {/* 隐藏的 canvas 用于图片处理 */}
      <canvas ref={hiddenCanvasRef} className="hidden-canvas" />
    </div>
  );
}

export default App;