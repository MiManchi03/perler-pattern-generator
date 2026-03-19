import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  rgbToHex, 
  rgbToHsl, 
  generateShades, 
  sortColorsByRgb, 
  generateRainbowGradient,
  getContrastColor,
  isColorEqual
} from '../utils/ColorUtils';

function ColorBubble({ 
  visible, 
  originalColor, 
  allColors, 
  onConfirm, 
  onCancel,
  onShowMore,
  visibleCount,
  totalCount,
  position = { x: 0, y: 0 },
  selectedCell, // 新增：选中的格子位置
  cellId, // 新增：格子的颜色编号
  currentColor // 新增：当前格子的颜色
}) {
  const [selectedColor, setSelectedColor] = useState(originalColor || [255, 0, 0]);
  const [hue, setHue] = useState(() => {
    if (!originalColor) return 0;
    const hsl = rgbToHsl(originalColor);
    return hsl[0];
  });
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState(position);
  
  const bubbleRef = useRef(null);
  const dragHandleRef = useRef(null);

  // 生成渐变色
  const shadeColors = useMemo(() => {
    return generateShades(originalColor, 11);
  }, [originalColor]);

  // 合并去重后的颜色列表（渐变色在前）
  const mergedColors = useMemo(() => {
    const filtered = allColors.filter(c => !shadeColors.some(shade => isColorEqual(shade, c)));
    const sorted = sortColorsByRgb(filtered);
    return [...shadeColors, ...sorted];
  }, [allColors, shadeColors]);

  // 显示的颜色（渐变色 + 分页的图纸色）
  const displayColors = useMemo(() => {
    const shadeCount = shadeColors.length;
    const paletteColors = mergedColors.slice(shadeCount, shadeCount + visibleCount);
    return [...shadeColors, ...paletteColors];
  }, [mergedColors, shadeColors, visibleCount]);

  // 是否有更多颜色可显示
  const hasMore = (totalCount - shadeColors.length) > visibleCount;

  // 彩虹滑块使用的颜色
  const rainbowGradient = generateRainbowGradient();

  // 当前选中颜色预览
  const previewColor = rgbToHex(selectedColor);

  // 处理滑块滚动
  const handleScroll = (e) => {
    setScrollPosition(e.target.scrollTop);
  };

  // 处理彩虹选择器变化
  const handleHueChange = (e) => {
    const newHue = Number(e.target.value);
    setHue(newHue);
    // 更新选中颜色为当前色相的纯色
    const s = 100;
    const l = 50;
    const h = newHue / 360;
    const rgb = hslToRgbSimple(h, s, l);
    setSelectedColor(rgb);
  };

  // 处理拖动开始（鼠标和触摸）
  const handleDragStart = (e) => {
    // 阻止事件冒泡，避免影响父元素
    e.stopPropagation();
    
    // 排除功能按钮和交互元素
    const isInteractiveElement = e.target.closest('.close-btn') || 
                               e.target.closest('.btn-cancel') || 
                               e.target.closest('.btn-confirm') || 
                               e.target.closest('.show-more-btn') || 
                               e.target.closest('.color-swatch') || 
                               e.target.closest('.rainbow-slider') ||
                               e.target.closest('.rainbow-track') ||
                               e.target.closest('.drag-icon');
    
    if (!isInteractiveElement) {
      setIsDragging(true);
      
      // 获取坐标（支持触摸事件）
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      
      setDragOffset({
        x: clientX - currentPosition.x,
        y: clientY - currentPosition.y
      });
      document.body.style.userSelect = 'none';
      document.body.style.touchAction = 'none';
    }
  };

  // 处理拖动中（鼠标和触摸）
  const handleDragMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      
      // 获取坐标（支持触摸事件）
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      
      setCurrentPosition({
        x: clientX - dragOffset.x,
        y: clientY - dragOffset.y
      });
    }
  };

  // 处理拖动结束（鼠标和触摸）
  const handleDragEnd = (e) => {
    if (isDragging) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.touchAction = '';
    }
  };

  // 监听全局鼠标和触摸事件
  useEffect(() => {
    if (isDragging) {
      const handleMove = (e) => handleDragMove(e);
      const handleUp = (e) => handleDragEnd(e);
      
      // 添加鼠标事件监听
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      
      // 添加触摸事件监听（移动端）
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleUp);
      };
    }
  }, [isDragging, dragOffset]);

  // 重置位置
  useEffect(() => {
    setCurrentPosition(position);
  }, [position]);

  if (!visible) return null;

  return (
    <div 
      className="color-bubble-wrapper"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'auto',
        zIndex: 1000
      }}
      onClick={onCancel}
    >
      <div 
        ref={bubbleRef}
        className="color-bubble" 
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: `${currentPosition.x}px`,
          top: `${currentPosition.y}px`,
          transform: 'translate(-50%, -100%)',
          marginBottom: '10px',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        {/* 拖动手柄 */}
        <div 
          ref={dragHandleRef}
          className="bubble-drag-handle"
          title="按住拖动"
        >
          <div className="drag-icon">⋮⋮</div>
        </div>
        
        {/* 聊天气泡小尾巴 */}
        <div className="bubble-tail"></div>
        
        {/* 标题和关闭按钮 */}
        <div className="color-bubble-header">
          <div className="header-left">
            自定义颜色
          </div>
          <button 
            className="close-btn"
            onClick={onCancel}
            title="关闭"
          >
            ×
          </button>
        </div>

        {/* 当前格子预览 */}
        <div className="current-cell-preview">
          <div className="preview-label">当前格子: {selectedCell?.x},{selectedCell?.y}</div>
          <div className="cell-preview">
            <div 
              className="preview-cell"
              style={{ 
                backgroundColor: rgbToHex(selectedColor),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '60px',
                height: '60px',
                borderRadius: '8px',
                border: '2px solid #ddd',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <span 
                style={{ 
                  color: getContrastColor(selectedColor),
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              >
                {cellId}
              </span>
            </div>
          </div>
        </div>

        {/* 彩虹选择器 */}
        <div className="rainbow-selector">
          <div className="rainbow-label">🌈 颜色选择</div>
          <div className="rainbow-track" style={{ background: rainbowGradient }}>
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={handleHueChange}
              className="rainbow-slider"
            />
          </div>
          <div className="current-color-preview">
            当前: <span style={{ color: previewColor }}>{previewColor}</span>
          </div>
        </div>

        {/* 颜色选择区域 */}
        <div className="color-palette" onScroll={handleScroll}>
          {/* 渐变色区域 */}
          <div className="shade-grid">
            {shadeColors.map((color, index) => {
              const hex = rgbToHex(color);
              const isSelected = isColorEqual(color, selectedColor);
              const isOriginal = isColorEqual(color, originalColor);
              
              return (
                <div
                  key={`shade-${hex}-${index}`}
                  className={`color-swatch ${isSelected ? 'selected' : ''} ${isOriginal ? 'original' : ''}`}
                  style={{ backgroundColor: hex }}
                  onClick={() => setSelectedColor(color)}
                >
                  {isSelected && <span style={{ color: getContrastColor(color) }}>✓</span>}
                </div>
              );
            })}
          </div>

          {/* 图纸颜色区域 */}
          <div className="palette-grid">
            {displayColors.slice(shadeColors.length).map((color, index) => {
              const hex = rgbToHex(color);
              const isSelected = isColorEqual(color, selectedColor);
              const isOriginal = isColorEqual(color, originalColor);
              
              return (
                <div
                  key={`palette-${hex}-${index}`}
                  className={`color-swatch ${isSelected ? 'selected' : ''} ${isOriginal ? 'original' : ''}`}
                  style={{ backgroundColor: hex }}
                  onClick={() => setSelectedColor(color)}
                >
                  {isSelected && <span style={{ color: getContrastColor(color) }}>✓</span>}
                </div>
              );
            })}
          </div>

          {/* 展示更多 */}
          {hasMore && (
            <button className="show-more-btn" onClick={onShowMore}>
              展示更多 ({totalCount - shadeColors.length - visibleCount + 20} 更多)
            </button>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="color-bubble-footer">
          <button className="btn-cancel" onClick={onCancel}>
            取消
          </button>
          <button 
            className="btn-confirm" 
            onClick={() => onConfirm(selectedColor)}
            style={{ backgroundColor: previewColor }}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

// 简化的HSL转RGB
function hslToRgbSimple(h, s, l) {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export default ColorBubble;