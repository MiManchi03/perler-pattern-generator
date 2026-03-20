import { useEffect, useRef, useState } from 'react';

function PatternCanvas({ pixelData, settings, isEditMode, onCellClick, getCellColor, getCellDisplay }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 重置缩放和位置
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [pixelData]);

  // 绘制画布
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pixelData) return;

    const ctx = canvas.getContext('2d');
    const { grid, colors } = pixelData;
    
    const headerSize = settings.showRowCol ? 40 : 0;
    const cellSize = 20; // 固定单元格大小
    
    const cols = grid[0].length;
    const rows = grid.length;
    
    const width = grid[0].length * cellSize + headerSize;
    const height = grid.length * cellSize + headerSize;

    canvas.width = width;
    canvas.height = height;

    // 清空画布
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 绘制网格和颜色
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        const cell = grid[y][x];
        const posX = headerSize + x * cellSize;
        const posY = headerSize + y * cellSize;

        // 获取颜色（考虑修改）
        const cellDisplay = getCellDisplay ? getCellDisplay(cell, x, y) : null;
        const cellRgb = cellDisplay?.rgb || (getCellColor ? getCellColor(cell, x, y) : cell?.rgb);
        const cellHex = cellRgb ? rgbToHex(cellRgb) : null;
        const cellId = cellDisplay?.id || cell?.id;

        // 绘制格子背景
        if (cellHex) {
          ctx.fillStyle = cellHex;
          ctx.fillRect(posX, posY, cellSize, cellSize);
          
          // 编辑模式下格子边框高亮
          if (isEditMode) {
            ctx.strokeStyle = '#667eea';
            ctx.lineWidth = 2;
            ctx.strokeRect(posX + 1, posY + 1, cellSize - 2, cellSize - 2);
          }
        } else {
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(posX, posY, cellSize, cellSize);
        }

        // 绘制网格线
        if (settings.showGrid) {
          ctx.strokeStyle = isEditMode ? '#aaa' : '#cccccc';
          ctx.lineWidth = isEditMode ? 1 : 0.5;
          
          // 只绘制内部网格线，避免边界超出
          if (x < grid[0].length - 1) {
            ctx.beginPath();
            ctx.moveTo(posX + cellSize, posY);
            ctx.lineTo(posX + cellSize, posY + cellSize);
            ctx.stroke();
          }
          if (y < grid.length - 1) {
            ctx.beginPath();
            ctx.moveTo(posX, posY + cellSize);
            ctx.lineTo(posX + cellSize, posY + cellSize);
            ctx.stroke();
          }
          // 绘制顶部和左侧边框
          if (x === 0) {
            ctx.beginPath();
            ctx.moveTo(posX, posY);
            ctx.lineTo(posX, posY + cellSize);
            ctx.stroke();
          }
          if (y === 0) {
            ctx.beginPath();
            ctx.moveTo(posX, posY);
            ctx.lineTo(posX + cellSize, posY);
            ctx.stroke();
          }
        }

        // 绘制色号
        if (settings.showColorCode && cell && cellRgb) {
          ctx.fillStyle = getContrastColor(cellRgb);
          const fontSize = Math.max(6, Math.floor(cellSize * 0.4));
          ctx.font = `${fontSize}px 'Arial', 'Helvetica', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          ctx.strokeStyle = ctx.fillStyle === '#000000' ? '#ffffff' : '#000000';
          ctx.lineWidth = Math.max(1, Math.floor(fontSize * 0.15));
          
          if (cellId) {
            ctx.strokeText(cellId, posX + cellSize / 2, posY + cellSize / 2, cellSize * 0.8);
            ctx.fillText(cellId, posX + cellSize / 2, posY + cellSize / 2);
          }
        }
      }
    }

    // 绘制行列号
    if (settings.showRowCol) {
      ctx.fillStyle = '#333333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 列号 (顶部)
      for (let x = 0; x < grid[0].length; x++) {
        const posX = headerSize + x * cellSize + cellSize / 2;
        ctx.fillText(x + 1, posX, 20);
      }

      // 行号 (左侧)
      ctx.textAlign = 'right';
      for (let y = 0; y < grid.length; y++) {
        const posY = headerSize + y * cellSize + cellSize / 2;
        ctx.fillText(y + 1, 30, posY);
      }

      // 绘制行列号背景线
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(headerSize, 0);
      ctx.lineTo(headerSize, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, headerSize);
      ctx.lineTo(width, headerSize);
      ctx.stroke();
    }
  }, [pixelData, settings, isEditMode, getCellColor]);

  // 处理鼠标滚轮缩放
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, scale * delta));
    setScale(newScale);
  };

  // 处理鼠标按下开始拖拽
  const handleMouseDown = (e) => {
    // 如果在编辑模式下点击，不触发拖拽
    if (isEditMode) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  // 处理鼠标移动拖拽
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  // 处理鼠标释放结束拖拽
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 处理鼠标离开结束拖拽
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // 处理格子点击
  const handleClick = (e) => {
    if (!isEditMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas || !pixelData) return;
    
    const rect = canvas.getBoundingClientRect();
    const headerSize = settings.showRowCol ? 40 : 0;
    const cellSize = 20;
    
    const scaledX = (e.clientX - rect.left) / scale;
    const scaledY = (e.clientY - rect.top) / scale;
    
    const x = Math.floor((scaledX - headerSize) / cellSize);
    const y = Math.floor((scaledY - headerSize) / cellSize);
    
    if (x >= 0 && x < pixelData.grid[0].length && y >= 0 && y < pixelData.grid.length) {
      onCellClick && onCellClick(x, y, e.clientX, e.clientY);
    }
  };

  // 根据背景色选择对比色文字
  function getContrastColor(rgb) {
    const [r, g, b] = rgb;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  }

  // RGB转Hex
  function rgbToHex(rgb) {
    return `#${((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1).toUpperCase()}`;
  }

  return (
    <div 
      ref={containerRef}
      className="canvas-wrapper"
      style={{
        width: '100%',
        height: '600px',
        overflow: 'auto',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : (isEditMode ? 'crosshair' : 'grab')
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div 
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          transition: 'transform 0.1s ease'
        }}
      >
        <canvas id="pattern-canvas" ref={canvasRef} />
      </div>
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(255, 255, 255, 0.8)',
        padding: '8px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <p style={{ margin: '0', fontSize: '12px', color: '#333' }}>
          缩放: {Math.round(scale * 100)}%
        </p>
        <p style={{ margin: '5px 0 0 0', fontSize: '10px', color: '#666' }}>
          {isEditMode ? '提示: 点击格子可修改颜色' : '提示: 鼠标滚轮缩放，拖拽平移'}
        </p>
      </div>
    </div>
  );
}

export default PatternCanvas;