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
  position = { x: 0, y: 0 } // 新增：弹窗位置
}) {
  const [selectedColor, setSelectedColor] = useState(originalColor || [255, 0, 0]);
  const [hue, setHue] = useState(() => {
    if (!originalColor) return 0;
    const hsl = rgbToHsl(originalColor);
    return hsl[0];
  });
  const [scrollPosition, setScrollPosition] = useState(0);
  const bubbleRef = useRef(null);

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

  if (!visible) return null;

  return (
    <div 
      className="color-bubble-overlay" 
      onClick={onCancel}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      <div 
        ref={bubbleRef}
        className="color-bubble" 
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -100%)',
          marginBottom: '10px',
          pointerEvents: 'auto'
        }}
      >
        {/* 聊天气泡小尾巴 */}
        <div className="bubble-tail"></div>
        
        {/* 标题 */}
        <div className="color-bubble-header">
          自定义颜色
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