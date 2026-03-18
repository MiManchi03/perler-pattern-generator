// 专业像素艺术转换器 - 借鉴pixelme.app的先进技术
// 2026-03-16：改用基于格子加权平均的算法，解决右边细节丢失问题
import { perlerColors, colorDistance, ciede2000, findClosestColor, calculateGridColorsByUniquePrinciple } from './gridBasedConverter.js';

// 主转换函数
export function proImageToPixelGrid(imageData, width, height, targetSize = 50) {
  // 使用新的基于格子的独苗原则算法
  return calculateGridColorsByUniquePrinciple(imageData.data, width, height, targetSize);
}

// 双线性插值缩放 - 保留边缘细节
function bilinearScale(imageData, srcWidth, srcHeight, targetSize) {
  const srcData = imageData.data;
  const targetWidth = targetSize;
  const targetHeight = Math.round(targetSize * srcHeight / srcWidth);
  const targetData = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  
  const scaleX = srcWidth / targetWidth;
  const scaleY = srcHeight / targetHeight;
  
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = x * scaleX;
      const srcY = y * scaleY;
      
      const x1 = Math.floor(srcX);
      const y1 = Math.floor(srcY);
      const x2 = Math.min(x1 + 1, srcWidth - 1);
      const y2 = Math.min(y1 + 1, srcHeight - 1);
      
      const dx = srcX - x1;
      const dy = srcY - y1;
      
      for (let c = 0; c < 4; c++) {
        const idx = (y * targetWidth + x) * 4 + c;
        
        // 双线性插值公式
        const p1 = srcData[(y1 * srcWidth + x1) * 4 + c];
        const p2 = srcData[(y1 * srcWidth + x2) * 4 + c];
        const p3 = srcData[(y2 * srcWidth + x1) * 4 + c];
        const p4 = srcData[(y2 * srcWidth + x2) * 4 + c];
        
        const top = p1 * (1 - dx) + p2 * dx;
        const bottom = p3 * (1 - dx) + p4 * dx;
        targetData[idx] = top * (1 - dy) + bottom * dy;
      }
    }
  }
  
  return { data: targetData, width: targetWidth, height: targetHeight };
}

// 生成最优调色板 - 使用CIEDE2000色差
function generateOptimalPalette(scaledData, width, height, colorCount) {
  const data = scaledData.data;
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
  
  // 使用K-means++初始化，确保更好的聚类
  const centroids = kMeansPlusPlus(pixels, colorCount);
  
  // 迭代优化聚类
  let converged = false;
  let iterations = 0;
  
  while (!converged && iterations < 20) {
    const clusters = Array(colorCount).fill().map(() => []);
    
    // 分配像素到最近的聚类中心
    for (const pixel of pixels) {
      let minDistance = Infinity;
      let bestCluster = 0;
      
      for (let i = 0; i < centroids.length; i++) {
        const distance = ciede2000(pixel, centroids[i]);
        if (distance < minDistance) {
          minDistance = distance;
          bestCluster = i;
        }
      }
      
      clusters[bestCluster].push(pixel);
    }
    
    // 更新聚类中心
    const newCentroids = [];
    converged = true;
    
    for (let i = 0; i < clusters.length; i++) {
      if (clusters[i].length === 0) {
        newCentroids.push(centroids[i]);
        continue;
      }
      
      const sum = clusters[i].reduce((acc, pixel) => {
        return [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]];
      }, [0, 0, 0]);
      
      const newCentroid = [
        Math.round(sum[0] / clusters[i].length),
        Math.round(sum[1] / clusters[i].length),
        Math.round(sum[2] / clusters[i].length)
      ];
      
      // 检查是否收敛
      if (colorDistance(newCentroid, centroids[i]) > 1) {
        converged = false;
      }
      
      newCentroids.push(newCentroid);
    }
    
    centroids.splice(0, centroids.length, ...newCentroids);
    iterations++;
  }
  
  return centroids;
}

// K-means++初始化
function kMeansPlusPlus(pixels, k) {
  const centroids = [];
  
  // 随机选择第一个中心
  centroids.push([...pixels[Math.floor(Math.random() * pixels.length)]]);
  
  for (let i = 1; i < k; i++) {
    const distances = [];
    let totalDistance = 0;
    
    // 计算每个像素到最近中心的距离
    for (const pixel of pixels) {
      let minDistance = Infinity;
      
      for (const centroid of centroids) {
        const distance = ciede2000(pixel, centroid);
        minDistance = Math.min(minDistance, distance);
      }
      
      distances.push(minDistance);
      totalDistance += minDistance;
    }
    
    // 按距离概率选择下一个中心
    const randomValue = Math.random() * totalDistance;
    let cumulativeDistance = 0;
    
    for (let j = 0; j < distances.length; j++) {
      cumulativeDistance += distances[j];
      if (cumulativeDistance >= randomValue) {
        centroids.push([...pixels[j]]);
        break;
      }
    }
  }
  
  return centroids;
}

// 高级抖动算法 - 使用Z字形扫描解决右边失真问题
function applyAdvancedDithering(scaledData, width, height, palette) {
  const data = scaledData.data;
  const grid = [];
  
  // 初始化网格
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      
      if (data[i + 3] < 128) {
        row.push(null);
        continue;
      }
      
      const rgb = [data[i], data[i + 1], data[i + 2]];
      const closestColor = findClosestColorCIEDE(rgb, palette);
      
      row.push({
        id: getColorId(closestColor, palette),
        name: `颜色 ${getColorId(closestColor, palette)}`,
        hex: rgbToHex(closestColor),
        rgb: closestColor
      });
    }
    grid.push(row);
  }
  
  // 对于小尺寸，完全禁用抖动，直接返回原始网格
  if (width <= 50 || height <= 50) {
    return grid;
  }
  
  // Z字形扫描抖动（解决右边失真问题）
  const errorMatrix = Array(height).fill().map(() => Array(width).fill().map(() => [0, 0, 0]));
  
  for (let y = 0; y < height; y++) {
    // 偶数行从左到右，奇数行从右到左
    const leftToRight = y % 2 === 0;
    const startX = leftToRight ? 0 : width - 1;
    const endX = leftToRight ? width : -1;
    const stepX = leftToRight ? 1 : -1;
    
    for (let x = startX; x !== endX; x += stepX) {
      if (!grid[y][x]) continue;
      
      const originalColor = grid[y][x].rgb;
      
      // 应用累积误差
      const colorWithError = [
        Math.max(0, Math.min(255, originalColor[0] + errorMatrix[y][x][0])),
        Math.max(0, Math.min(255, originalColor[1] + errorMatrix[y][x][1])),
        Math.max(0, Math.min(255, originalColor[2] + errorMatrix[y][x][2]))
      ];
      
      // 使用CIEDE2000找到最接近的颜色
      const quantizedColor = findClosestColorCIEDE(colorWithError, palette);
      
      // 计算量化误差
      const error = [
        colorWithError[0] - quantizedColor[0],
        colorWithError[1] - quantizedColor[1],
        colorWithError[2] - quantizedColor[2]
      ];
      
      // 更新当前像素
      grid[y][x] = {
        id: getColorId(quantizedColor, palette),
        name: `颜色 ${getColorId(quantizedColor, palette)}`,
        hex: rgbToHex(quantizedColor),
        rgb: quantizedColor
      };
      
      // 对称误差扩散（Z字形扫描）
      if (y + 1 < height) {
        // 下一行的三个位置
        if (x > 0) {
          errorMatrix[y + 1][x - 1][0] += error[0] * 3/16;
          errorMatrix[y + 1][x - 1][1] += error[1] * 3/16;
          errorMatrix[y + 1][x - 1][2] += error[2] * 3/16;
        }
        
        errorMatrix[y + 1][x][0] += error[0] * 5/16;
        errorMatrix[y + 1][x][1] += error[1] * 5/16;
        errorMatrix[y + 1][x][2] += error[2] * 5/16;
        
        if (x < width - 1) {
          errorMatrix[y + 1][x + 1][0] += error[0] * 3/16;
          errorMatrix[y + 1][x + 1][1] += error[1] * 3/16;
          errorMatrix[y + 1][x + 1][2] += error[2] * 3/16;
        }
        
        // 同一行的另一个方向（Z字形关键）
        if (leftToRight && x < width - 1) {
          errorMatrix[y][x + 1][0] += error[0] * 5/16;
          errorMatrix[y][x + 1][1] += error[1] * 5/16;
          errorMatrix[y][x + 1][2] += error[2] * 5/16;
        } else if (!leftToRight && x > 0) {
          errorMatrix[y][x - 1][0] += error[0] * 5/16;
          errorMatrix[y][x - 1][1] += error[1] * 5/16;
          errorMatrix[y][x - 1][2] += error[2] * 5/16;
        }
      }
    }
  }
  
  return grid;
}

// 小细节增强 - 特别针对30×30、50×50尺寸
function enhanceSmallDetails(grid, palette) {
  const height = grid.length;
  if (height === 0) return grid;
  
  const width = grid[0].length;
  const result = JSON.parse(JSON.stringify(grid));
  
  // 边缘检测
  const edgeMap = detectEdges(result);
  
  // 针对小尺寸的特殊处理
  if (width <= 50) {
    // 关键改进：对右边区域使用更强的对比度增强
    const rightThreshold = Math.floor(width * 0.5);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!result[y][x]) continue;
        
        const isRightSide = x >= rightThreshold;
        
        // 1. 如果是边缘区域，完全保持原始颜色
        if (edgeMap[y][x] > 0.2) {
          // 对右边边缘进行特殊增强
          if (isRightSide) {
            const [r, g, b] = result[y][x].rgb;
            const lum = getLuminance(result[y][x].rgb);
            
            // 加深暗色边缘
            if (lum < 100) {
              result[y][x].rgb = [
                Math.min(255, Math.round(r * 1.2)),
                Math.min(255, Math.round(g * 1.2)),
                Math.min(255, Math.round(b * 1.2))
              ];
              result[y][x].hex = rgbToHex(result[y][x].rgb);
            }
          }
          continue;
        }
        
        // 2. 对小区域应用特殊保护
        const regionSize = getRegionSize(result, x, y);
        if (regionSize <= 4) { // 小区域保护
          // 对右边的小区域进行特殊处理
          if (isRightSide) {
            const [r, g, b] = result[y][x].rgb;
            const lum = getLuminance(result[y][x].rgb);
            
            // 适当增强对比度
            if (lum > 50 && lum < 200) {
              const factor = 1.1;
              result[y][x].rgb = [
                Math.min(255, Math.round(r * factor)),
                Math.min(255, Math.round(g * factor)),
                Math.min(255, Math.round(b * factor))
              ];
              result[y][x].hex = rgbToHex(result[y][x].rgb);
            }
          }
          continue;
        }
        
        // 3. 对大面积区域应用轻微平滑（但右边更保守）
        if (regionSize > 8) {
          if (!isRightSide) {
            applyConservativeSmoothing(result, x, y);
          }
        }
      }
    }
  } else {
    // 大尺寸：使用标准处理
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!result[y][x]) continue;
        
        if (edgeMap[y][x] > 0.3) {
          continue;
        }
        
        const regionSize = getRegionSize(result, x, y);
        if (regionSize <= 4) {
          continue;
        }
        
        if (regionSize > 8) {
          applyConservativeSmoothing(result, x, y);
        }
      }
    }
  }
  
  return result;
}

// 边缘检测
function detectEdges(grid) {
  const height = grid.length;
  const width = grid[0].length;
  const edgeMap = Array(height).fill().map(() => Array(width).fill(0));
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (!grid[y][x]) continue;
      
      const currentLum = getLuminance(grid[y][x].rgb);
      let maxGradient = 0;
      
      // 检查8邻域
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          
          const ny = y + dy;
          const nx = x + dx;
          
          if (grid[ny] && grid[ny][nx]) {
            const neighborLum = getLuminance(grid[ny][nx].rgb);
            const gradient = Math.abs(currentLum - neighborLum);
            maxGradient = Math.max(maxGradient, gradient);
          }
        }
      }
      
      edgeMap[y][x] = maxGradient / 255; // 归一化
    }
  }
  
  return edgeMap;
}

// 获取区域大小
function getRegionSize(grid, startX, startY) {
  const height = grid.length;
  const width = grid[0].length;
  const colorId = grid[startY][startX].id;
  const visited = Array(height).fill().map(() => Array(width).fill(false));
  
  let size = 0;
  const queue = [[startY, startX]];
  visited[startY][startX] = true;
  
  while (queue.length > 0) {
    const [y, x] = queue.shift();
    size++;
    
    // 检查4邻域
    for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const ny = y + dy;
      const nx = x + dx;
      
      if (ny >= 0 && ny < height && nx >= 0 && nx < width && 
          !visited[ny][nx] && grid[ny][nx] && grid[ny][nx].id === colorId) {
        visited[ny][nx] = true;
        queue.push([ny, nx]);
      }
    }
  }
  
  return size;
}

// 保守平滑
function applyConservativeSmoothing(grid, x, y) {
  const height = grid.length;
  const width = grid[0].length;
  
  const neighborColors = new Map();
  
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const ny = y + dy;
      const nx = x + dx;
      
      if (ny >= 0 && ny < height && nx >= 0 && nx < width && grid[ny][nx]) {
        const colorId = grid[ny][nx].id;
        neighborColors.set(colorId, (neighborColors.get(colorId) || 0) + 1);
      }
    }
  }
  
  if (neighborColors.size > 0) {
    let maxCount = 0;
    let dominantColorId = grid[y][x].id;
    
    for (const [colorId, count] of neighborColors.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantColorId = colorId;
      }
    }
    
    // 只有在颜色高度一致时才平滑
    if (maxCount >= 8 && dominantColorId !== grid[y][x].id) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width && 
              grid[ny][nx] && grid[ny][nx].id === dominantColorId) {
            grid[y][x] = grid[ny][nx];
            return;
          }
        }
      }
    }
  }
}

// 辅助函数
function findClosestColorCIEDE(rgb, palette) {
  let minDistance = Infinity;
  let closestColor = palette[0];
  
  for (const color of palette) {
    const distance = ciede2000(rgb, color);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }
  
  return closestColor;
}

function getColorId(color, palette) {
  const index = palette.findIndex(c => 
    c[0] === color[0] && c[1] === color[1] && c[2] === color[2]
  );
  return generateShortColorId(index + 1);
}

function generateShortColorId(index) {
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

function rgbToHex(rgb) {
  return `#${((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1).toUpperCase()}`;
}

function getLuminance(rgb) {
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
}

function generateDefaultPalette(colorCount) {
  const palette = [];
  for (let i = 0; i < colorCount; i++) {
    const value = Math.floor(i * 255 / (colorCount - 1));
    palette.push([value, value, value]);
  }
  return palette;
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