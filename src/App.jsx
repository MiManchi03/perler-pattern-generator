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
  isColorEqual,
  generateColorId
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
  const [previewColor, setPreviewColor] = useState(null); // 弹窗内实时预览颜色
  const [history, setHistory] = useState([]); // [{key, oldColor, newColor}]
  const [redoHistory, setRedoHistory] = useState([]); // [{key, oldColor, newColor}]
  const [visibleColorCount, setVisibleColorCount] = useState(20); // 分页显示
  
  const hiddenCanvasRef = useRef(null);

  // 获取周围格子颜色并按距离排序
  const getSurroundingColors = useMemo(() => {
    if (!selectedCell || !pixelData) return [];
    
    const { x, y } = selectedCell;
    const grid = pixelData.grid;
    const colors = new Map();
    const colorOrder = []; // 记录颜色发现的顺序
    const maxDistance = 4; // 最多扫描四圈
    
    // 原点格子本身
    const cell = grid[y]?.[x];
    if (cell?.rgb) {
      const colorKey = cell.rgb.join(',');
      if (!colors.has(colorKey)) {
        colors.set(colorKey, cell.rgb);
        colorOrder.push(cell.rgb);
      }
    }
    
    // 从距离1开始，最多到距离4，依次扫描每一圈
    for (let distance = 1; distance <= maxDistance; distance++) {
      // 真正的顺时针转圈扫描 - 从最右边开始，一格一格地顺时针走
      
      // 当前圈的起点：最右边的格子 (x+distance, y)
      let currentX = x + distance;
      let currentY = y;
      
      // 移动方向：下、左、上、右（顺时针方向）
      const directions = [
        [0, 1],  // 下
        [-1, 0], // 左
        [0, -1], // 上
        [1, 0]   // 右
      ];
      
      // 每个方向的步数：下、左、上、右
      const stepsPerDirection = [
        distance * 2,  // 下：移动2*distance步
        distance * 2,  // 左：移动2*distance步
        distance * 2,  // 上：移动2*distance步
        distance * 2 - 1  // 右：移动2*distance-1步（避免重复起点）
      ];
      
      // 当前移动方向索引
      let directionIndex = 0;
      
      // 当前方向需要移动的步数
      let stepsInDirection = stepsPerDirection[directionIndex];
      
      // 开始顺时针转圈扫描
      for (let step = 0; step < distance * 8 - 1; step++) {
        // 检查当前格子
        if (currentX >= 0 && currentX < grid[0].length && currentY >= 0 && currentY < grid.length) {
          const cell = grid[currentY][currentX];
          if (cell?.rgb) {
            const colorKey = cell.rgb.join(',');
            if (!colors.has(colorKey)) {
              colors.set(colorKey, cell.rgb);
              colorOrder.push(cell.rgb);
            }
          }
        }
        
        // 移动到下一个格子
        const [dx, dy] = directions[directionIndex];
        currentX += dx;
        currentY += dy;
        
        // 减少当前方向的剩余步数
        stepsInDirection--;
        
        // 如果当前方向走完了，切换到下一个方向
        if (stepsInDirection === 0) {
          directionIndex = (directionIndex + 1) % 4;
          stepsInDirection = stepsPerDirection[directionIndex];
        }
      }
    }
    
    // 按发现顺序返回颜色
    return colorOrder;
  }, [selectedCell, pixelData]);

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
      setPreviewColor(null);
      setSelectedCell(null);
    } else {
      if (!pixelData) {
        alert('请先上传图片并生成图纸，再使用自定义格子功能');
        return;
      }
      // 进入编辑模式
      setIsEditMode(true);
    }
  }, [isEditMode, pixelData]);

  // 点击格子
  const handleCellClick = useCallback((x, y, clientX, clientY) => {
    if (!isEditMode) return;

    const key = `${x},${y}`;
    const baseColor = modifiedColors.get(key) || originalGrid?.[y]?.[x]?.rgb || pixelData?.grid?.[y]?.[x]?.rgb || null;

    setSelectedCell({ x, y });
    setPreviewColor(baseColor);
    setBubblePosition({ x: clientX, y: clientY });
    setShowBubble(true);
  }, [isEditMode, modifiedColors, originalGrid, pixelData]);

  // 弹窗内实时预览颜色
  const handleColorPreview = useCallback((newColor) => {
    setPreviewColor(newColor);
  }, []);

  // 确认颜色修改
  const handleColorConfirm = useCallback((newColor) => {
    if (!selectedCell) return;

    const key = `${selectedCell.x},${selectedCell.y}`;
    const oldColor = selectedCellOriginalColor;

    const newHistory = [...history, { key, oldColor, newColor }].slice(-MAX_HISTORY);
    setHistory(newHistory);
    setRedoHistory([]);

    const newModified = new Map(modifiedColors);
    newModified.set(key, newColor);
    setModifiedColors(newModified);

    setPreviewColor(null);
    setShowBubble(false);
    setSelectedCell(null);
  }, [selectedCell, selectedCellOriginalColor, modifiedColors, history]);

  // 取消修改
  const handleColorCancel = useCallback(() => {
    setPreviewColor(null);
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
    setRedoHistory(prev => [...prev, lastChange].slice(-MAX_HISTORY));
  }, [history, modifiedColors]);

  // 还原（重做）
  const handleRedo = useCallback(() => {
    if (redoHistory.length === 0) return;

    const lastRedo = redoHistory[redoHistory.length - 1];
    const newRedoHistory = redoHistory.slice(0, -1);
    const newModified = new Map(modifiedColors);

    if (lastRedo.newColor) {
      newModified.set(lastRedo.key, lastRedo.newColor);
    } else {
      newModified.delete(lastRedo.key);
    }

    setRedoHistory(newRedoHistory);
    setModifiedColors(newModified);
    setHistory(prev => [...prev, lastRedo].slice(-MAX_HISTORY));
  }, [redoHistory, modifiedColors]);

  // 重置所有修改
  const handleReset = useCallback(() => {
    if (modifiedColors.size === 0) return;

    setModifiedColors(new Map());
    setHistory([]);
    setRedoHistory([]);
    setPreviewColor(null);
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
    // 如果当前正在编辑该格子，优先使用弹窗中的实时预览颜色
    if (showBubble && selectedCell && selectedCell.x === x && selectedCell.y === y && previewColor) {
      return previewColor;
    }

    const key = `${x},${y}`;
    if (modifiedColors.has(key)) {
      return modifiedColors.get(key);
    }
    if (originalGrid && originalGrid[y]?.[x]) {
      return originalGrid[y][x].rgb;
    }
    return cell?.rgb || null;
  }, [showBubble, selectedCell, previewColor, modifiedColors, originalGrid]);

  // 根据RGB获取当前显示的颜色编号
  const getColorIdForRgb = useCallback((rgb) => {
    if (!rgb || !pixelData?.colors) return rgb ? generateColorId(rgb) : '';

    for (const [colorId, colorInfo] of pixelData.colors) {
      const color = colorInfo?.color || colorInfo;
      if (color?.rgb && color.rgb[0] === rgb[0] && color.rgb[1] === rgb[1] && color.rgb[2] === rgb[2]) {
        return color.id || colorId;
      }
    }

    return generateColorId(rgb);
  }, [pixelData]);

  // 获取格子展示信息（颜色 + 编号）
  const getCellDisplay = useCallback((cell, x, y) => {
    const rgb = getCellColor(cell, x, y);
    const id = rgb ? getColorIdForRgb(rgb) : (cell?.id || '');
    return { rgb, id };
  }, [getCellColor, getColorIdForRgb]);

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
            onRedo={handleRedo}
            canRedo={redoHistory.length > 0}
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
                getCellDisplay={getCellDisplay}
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
        allColors={getSurroundingColors.length > 0 ? getSurroundingColors : allUniqueColors}
        onPreview={handleColorPreview}
        onConfirm={handleColorConfirm}
        onCancel={handleColorCancel}
        onShowMore={handleShowMore}
        visibleCount={visibleColorCount}
        totalCount={getSurroundingColors.length > 0 ? getSurroundingColors.length : allUniqueColors.length}
        position={bubblePosition}
        selectedCell={selectedCell}
        cellId={selectedCellId}
        currentColor={selectedCellOriginalColor}
        colorMap={pixelData?.colors || new Map()}
      />

      {/* 隐藏的 canvas 用于图片处理 */}
      <canvas ref={hiddenCanvasRef} className="hidden-canvas" />
    </div>
  );
}

export default App;