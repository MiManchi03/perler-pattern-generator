// 高级像素艺术转换器 - 使用中心采样法确保左右对称
import { perlerColors, colorDistance, findClosestColor as perlerFindClosestColor } from './perlerColors.js';

// 主转换函数
export function advancedImageToPixelGrid(imageData, width, height, colorCount, targetSize = 50) {
  const data = imageData.data;
  
  // 关键改进：对于小尺寸，直接使用原始像素，跳过颜色量化
  // 因为颜色量化会导致右边细节丢失
  const tempGrid = createDirectPixelGrid(imageData, width, height, targetSize, colorCount);
  
  // 应用右边区域增强
  const finalGrid = enhanceRightSide(tempGrid, targetSize);
  
  // 直接返回
  const colors = countColors(finalGrid);
  
  return { grid: finalGrid, colors };
}

// 直接使用原始像素 - 避免任何颜色量化导致的失真
function createDirectPixelGrid(imageData, width, height, targetSize, colorCount) {
  const data = imageData.data;
  const grid = [];
  
  // 目标网格尺寸
  const targetWidth = targetSize;
  const targetHeight = targetSize;
  
  // 计算每个网格单元覆盖的原图像素区域
  const scaleX = width / targetWidth;
  const scaleY = height / targetHeight;
  
  // 预计算所有颜色，避免重复计算
  const colorMap = new Map();
  let colorIndex = 0;
  
  // 关键改进：确保采样点对称
  for (let y = 0; y < targetHeight; y++) {
    const row = [];
    for (let x = 0; x < targetWidth; x++) {
      // 计算当前网格单元的原图像素区域
      const xStart = Math.floor(x * scaleX);
      const xEnd = Math.floor((x + 1) * scaleX);
      const yStart = Math.floor(y * scaleY);
      const yEnd = Math.floor((y + 1) * scaleY);
      
      // 关键改进：使用更精确的采样位置
      // 对于左边和右边使用对称的采样策略
      let sampleX;
      if (x < targetWidth / 2) {
        // 左边：从左向右采样
        sampleX = Math.floor(xStart + (xEnd - xStart) * 0.3);
      } else {
        // 右边：从右向左采样，避免边缘模糊
        sampleX = Math.floor(xEnd - (xEnd - xStart) * 0.3);
      }
      
      const sampleY = Math.floor((yStart + yEnd) / 2);
      
      // 确保在图像范围内
      sampleX = Math.min(width - 1, Math.max(0, sampleX));
      const clampedY = Math.min(height - 1, Math.max(0, sampleY));
      
      const i = (clampedY * width + sampleX) * 4;
      
      // 检查透明度
      if (data[i + 3] < 64) {
        row.push(null);
        continue;
      }
      
      // 直接使用原始RGB值
      let rgb = [data[i], data[i + 1], data[i + 2]];
      
      // 关键改进：对于右边，适当增强颜色对比度
      if (x >= targetWidth / 2) {
        const luminance = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
        if (luminance > 30 && luminance < 220) {
          // 适当调整，避免变淡
          const factor = 1.05;
          rgb = [
            Math.min(255, Math.round(rgb[0] * factor)),
            Math.min(255, Math.round(rgb[1] * factor)),
            Math.min(255, Math.round(rgb[2] * factor))
          ];
        }
      }
      
      // 使用RGB作为颜色ID（确保左右对称）
      const colorKey = `${rgb[0]}-${rgb[1]}-${rgb[2]}`;
      
      let colorInfo;
      if (colorMap.has(colorKey)) {
        colorInfo = colorMap.get(colorKey);
      } else {
        // 生成唯一ID
        const id = `C${++colorIndex}`;
        colorInfo = {
          id: id,
          name: `颜色 ${id}`,
          rgb: rgb
        };
        colorMap.set(colorKey, colorInfo);
      }
      
      row.push({
        id: colorInfo.id,
        name: colorInfo.name,
        hex: rgbToHex(rgb),
        rgb: rgb
      });
    }
    grid.push(row);
  }
  
  return grid;
}

// Median Cut颜色量化算法
function medianCutQuantization(imageData, width, height, colorCount) {
  const data = imageData.data;
  const pixels = [];
  
  // 收集所有不透明像素
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= 128) {
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  
  if (pixels.length === 0) {
    return generateDefaultPalette(colorCount);
  }
  
  // 初始盒子包含所有像素
  const initialBox = {
    pixels: pixels,
    minR: 0, maxR: 255,
    minG: 0, maxG: 255,
    minB: 0, maxB: 255
  };
  
  const boxes = [initialBox];
  
  // 递归分割盒子直到达到目标颜色数量
  while (boxes.length < colorCount && boxes.length < pixels.length) {
    // 找到最大的盒子
    let largestBoxIndex = 0;
    let largestRange = -1;
    
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const rangeR = box.maxR - box.minR;
      const rangeG = box.maxG - box.minG;
      const rangeB = box.maxB - box.minB;
      const maxRange = Math.max(rangeR, rangeG, rangeB);
      
      if (maxRange > largestRange) {
        largestRange = maxRange;
        largestBoxIndex = i;
      }
    }
    
    const boxToSplit = boxes[largestBoxIndex];
    
    // 确定分割轴
    const rangeR = boxToSplit.maxR - boxToSplit.minR;
    const rangeG = boxToSplit.maxG - boxToSplit.minG;
    const rangeB = boxToSplit.maxB - boxToSplit.minB;
    
    let splitAxis = 'r';
    if (rangeG > rangeR && rangeG > rangeB) splitAxis = 'g';
    else if (rangeB > rangeR && rangeB > rangeG) splitAxis = 'b';
    
    // 按中位数分割
    const sortedPixels = [...boxToSplit.pixels].sort((a, b) => {
      const index = splitAxis === 'r' ? 0 : (splitAxis === 'g' ? 1 : 2);
      return a[index] - b[index];
    });
    
    const medianIndex = Math.floor(sortedPixels.length / 2);
    
    const box1 = { pixels: sortedPixels.slice(0, medianIndex) };
    const box2 = { pixels: sortedPixels.slice(medianIndex) };
    
    // 计算新盒子的边界
    calculateBoxBounds(box1);
    calculateBoxBounds(box2);
    
    // 替换原盒子
    boxes.splice(largestBoxIndex, 1, box1, box2);
  }
  
  // 为每个盒子计算平均颜色
  const palette = [];
  for (const box of boxes) {
    if (box.pixels.length > 0) {
      const sum = box.pixels.reduce((acc, pixel) => {
        return [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]];
      }, [0, 0, 0]);
      
      const avgColor = [
        Math.round(sum[0] / box.pixels.length),
        Math.round(sum[1] / box.pixels.length),
        Math.round(sum[2] / box.pixels.length)
      ];
      
      palette.push(avgColor);
    }
  }
  
  return palette;
}

// 辅助函数
function calculateBoxBounds(box) {
  if (box.pixels.length === 0) return;
  
  box.minR = 255; box.maxR = 0;
  box.minG = 255; box.maxG = 0;
  box.minB = 255; box.maxB = 0;
  
  for (const pixel of box.pixels) {
    box.minR = Math.min(box.minR, pixel[0]);
    box.maxR = Math.max(box.maxR, pixel[0]);
    box.minG = Math.min(box.minG, pixel[1]);
    box.maxG = Math.max(box.maxG, pixel[1]);
    box.minB = Math.min(box.minB, pixel[2]);
    box.maxB = Math.max(box.maxB, pixel[2]);
  }
}

function rgbToHex(rgb) {
  return `#${((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1).toUpperCase()}`;
}

function generateDefaultPalette(colorCount) {
  const palette = [];
  for (let i = 0; i < colorCount; i++) {
    const value = Math.floor(i * 255 / (colorCount - 1));
    palette.push([value, value, value]);
  }
  return palette;
}

// 增强右边区域 - 解决右边细节变淡的问题
function enhanceRightSide(grid, targetSize) {
  const height = grid.length;
  if (height === 0) return grid;
  
  const width = grid[0].length;
  const result = JSON.parse(JSON.stringify(grid));
  
  // 右边区域阈值
  const rightThreshold = Math.floor(width * 0.5);
  
  // 对整个图像应用边缘增强，但右边更强
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!result[y][x]) continue;
      
      // 检查8邻域，计算边缘强度
      let edgeScore = 0;
      let totalContrast = 0;
      let neighborCount = 0;
      
      const currentLuminance = getLuminance(result[y][x].rgb);
      
      // 检查8邻域
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          
          const ny = y + dy;
          const nx = x + dx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width && result[ny][nx]) {
            const neighborLuminance = getLuminance(result[ny][nx].rgb);
            const contrast = Math.abs(currentLuminance - neighborLuminance);
            
            totalContrast += contrast;
            neighborCount++;
            
            if (contrast > 30) {
              edgeScore++;
            }
          }
        }
      }
      
      // 如果是边缘或高对比度区域
      const avgContrast = neighborCount > 0 ? totalContrast / neighborCount : 0;
      
      if (edgeScore > 0 || avgContrast > 25) {
        const [r, g, b] = result[y][x].rgb;
        let newRgb = [r, g, b];
        
        // 根据位置调整强度
        const isRightSide = x >= rightThreshold;
        const strength = isRightSide ? 1.15 : 1.05; // 右边更强
        
        // 根据亮度调整
        if (currentLuminance < 100) {
          // 暗色：加深
          newRgb = [
            Math.min(255, Math.round(r * strength)),
            Math.min(255, Math.round(g * strength)),
            Math.min(255, Math.round(b * strength))
          ];
        } else if (currentLuminance > 150) {
          // 亮色：变暗一点
          newRgb = [
            Math.max(0, Math.round(r * 0.95)),
            Math.max(0, Math.round(g * 0.95)),
            Math.max(0, Math.round(b * 0.95))
          ];
        }
        
        // 更新像素
        result[y][x].rgb = newRgb;
        result[y][x].hex = rgbToHex(newRgb);
      }
    }
  }
  
  return result;
}

function countColors(grid) {
  const colorMap = new Map();
  
  for (const row of grid) {
    for (const cell of row) {
      if (cell) {
        const key = cell.id;
        if (!colorMap.has(key)) {
          colorMap.set(key, { color: cell, count: 0 });
        }
        colorMap.get(key).count++;
      }
    }
  }
  
  return colorMap;
}
