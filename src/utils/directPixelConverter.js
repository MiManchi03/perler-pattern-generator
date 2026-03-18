// 精确像素转换器 - 确保颜色准确性

// 缓存机制
const cache = new Map();

// 主转换函数
export function directImageToPixelGrid(imageData, width, height, colorCount, targetSize = 50) {
  const cacheKey = generateCacheKey(imageData, width, height, targetSize);
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  // 精确缩放，确保颜色准确性
  const scaledData = preciseScale(imageData, width, height, targetSize);
  const scaledWidth = targetSize;
  const scaledHeight = Math.round(targetSize * height / width);
  
  // 构建网格，直接使用原图颜色
  const result = buildGridWithPreciseColors(scaledData, scaledWidth, scaledHeight, colorCount);
  
  cache.set(cacheKey, result);
  
  if (cache.size > 10) {
    const keys = Array.from(cache.keys());
    cache.delete(keys[0]);
  }
  
  return result;
}

// 精确缩放 - 确保颜色准确性
function preciseScale(imageData, srcWidth, srcHeight, targetSize) {
  const srcData = imageData.data;
  const targetWidth = targetSize;
  const targetHeight = Math.round(targetSize * srcHeight / srcWidth);
  const targetData = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  
  const scaleX = srcWidth / targetWidth;
  const scaleY = srcHeight / targetHeight;
  
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      // 计算精确的中心坐标
      const centerX = (x + 0.5) * scaleX;
      const centerY = (y + 0.5) * scaleY;
      
      // 四舍五入到最近的像素
      const sampleX = Math.round(centerX);
      const sampleY = Math.round(centerY);
      
      // 确保坐标在有效范围内
      const clampedX = Math.max(0, Math.min(sampleX, srcWidth - 1));
      const clampedY = Math.max(0, Math.min(sampleY, srcHeight - 1));
      
      const srcIdx = (clampedY * srcWidth + clampedX) * 4;
      const idx = (y * targetWidth + x) * 4;
      
      // 直接使用中心像素的颜色，保持原图颜色
      targetData[idx] = srcData[srcIdx];
      targetData[idx + 1] = srcData[srcIdx + 1];
      targetData[idx + 2] = srcData[srcIdx + 2];
      targetData[idx + 3] = 255;
    }
  }
  
  return { data: targetData, width: targetWidth, height: targetHeight };
}

// 构建网格，直接使用原图颜色
function buildGridWithPreciseColors(scaledData, width, height, maxColors) {
  const data = scaledData.data;
  const grid = [];
  
  // 构建网格
  const colorMap = new Map();
  let colorIndex = 0;
  
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const rgb = [data[i], data[i + 1], data[i + 2]];
      
      // 直接使用原图颜色
      const rgbKey = rgb.join(',');
      
      let colorInfo;
      if (colorMap.has(rgbKey)) {
        colorInfo = colorMap.get(rgbKey);
      } else {
        colorIndex++;
        const hex = rgbToHex(rgb);
        colorInfo = {
          id: generateColorId(colorIndex),
          name: `颜色 ${colorIndex}`,
          hex: hex,
          rgb: rgb
        };
        colorMap.set(rgbKey, colorInfo);
      }
      
      row.push({
        id: colorInfo.id,
        name: colorInfo.name,
        hex: colorInfo.hex,
        rgb: colorInfo.rgb
      });
    }
    grid.push(row);
  }
  
  // 统计颜色使用
  const colors = new Map();
  for (const row of grid) {
    for (const cell of row) {
      if (cell) {
        const key = cell.id;
        if (!colors.has(key)) {
          colors.set(key, { color: cell, count: 0 });
        }
        colors.get(key).count++;
      }
    }
  }
  
  return { grid, colors };
}

// 生成颜色ID
function generateColorId(index) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = '';
  let num = index;
  
  while (num > 0) {
    const remainder = (num - 1) % 26;
    id = chars[remainder] + id;
    num = Math.floor((num - 1) / 26);
  }
  
  return id || 'A';
}

// 生成缓存键
function generateCacheKey(imageData, width, height, targetSize) {
  const data = imageData.data;
  let hash = 0;
  
  for (let i = 0; i < Math.min(data.length, 1000); i += 4) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash;
  }
  
  return `${hash}_${width}_${height}_${targetSize}`;
}

// 辅助函数
function rgbToHex(rgb) {
  return `#${((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1).toUpperCase()}`;
}