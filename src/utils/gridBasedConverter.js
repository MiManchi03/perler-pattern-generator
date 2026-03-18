// 拼豆图纸转换器 - CCA + Region Growing 算法
// 结合连通区域检测和区域生长，智能识别小细节

import { perlerColors, colorDistance, ciede2000, findClosestColor } from './perlerColors.js';
export { perlerColors, colorDistance, ciede2000, findClosestColor };

// ==================== 配置参数 ====================
const CONFIG = {
  // 深色阈值（亮度0-255，低于此值认为是深色细节如眼睛、眉毛等）
  DARK_LUMINANCE_THRESHOLD: 80,
  
  // 需要区域生长的深色占比阈值（低于此值触发区域生长）
  DETAIL_RATIO_THRESHOLD: 0.03,  // 3%
  
  // 区域生长的面积阈值（1/4格子 = 25%）
  AREA_THRESHOLD: 0.25,
  
  // 颜色相似度阈值（ΔE00 < 10，人眼可接受范围）
  COLOR_SIMILARITY_THRESHOLD: 10,
  
  // 连通性：8连通（包括对角线）
  CONNECTIVITY: 8
};

// ==================== 辅助函数 ====================
// 计算亮度
function getLuminance(rgb) {
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
}

// RGB转Hex
function rgbToHex(rgb) {
  return `#${((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1).toUpperCase()}`;
}

// ==================== 核心算法函数 ====================

/**
 * 提取格子内所有颜色的信息
 */
function extractColorsInCell(data, width, xStart, xEnd, yStart, yEnd) {
  const colorCounts = new Map();
  let totalPixels = 0;
  
  // 遍历格子内所有像素
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3];
      
      if (alpha < 64) continue; // 跳过透明像素
      
      const rgb = [data[i], data[i + 1], data[i + 2]];
      const rgbStr = rgb.join(',');
      
      const currentCount = colorCounts.get(rgbStr) || 0;
      colorCounts.set(rgbStr, currentCount + 1);
      totalPixels++;
    }
  }
  
  if (totalPixels === 0) {
    return { colors: [], totalPixels: 0 };
  }
  
  // 收集所有颜色及其信息
  const colors = [];
  for (const [rgbStr, count] of colorCounts.entries()) {
    const rgb = rgbStr.split(',').map(Number);
    const luminance = getLuminance(rgb);
    colors.push({
      rgb,
      count,
      ratio: count / totalPixels,
      luminance,
      isDark: luminance < CONFIG.DARK_LUMINANCE_THRESHOLD
    });
  }
  
  // 按占比降序排序
  colors.sort((a, b) => b.count - a.count);
  
  return { colors, totalPixels };
}

/**
 * 找到格子中的深色占比
 */
function getDarkRatio(colorInfo) {
  let darkCount = 0;
  for (const c of colorInfo.colors) {
    if (c.isDark) {
      darkCount += c.count;
    }
  }
  return darkCount / colorInfo.totalPixels;
}

/**
 * 找到格子中的最暗颜色
 */
function getDarkestColor(colorInfo) {
  let darkest = null;
  let minLuminance = Infinity;
  
  for (const c of colorInfo.colors) {
    if (c.isDark && c.luminance < minLuminance) {
      minLuminance = c.luminance;
      darkest = c;
    }
  }
  
  return darkest || colorInfo.colors[0];
}

/**
 * 区域生长算法 - BFS实现
 * 从种子格子出发，8连通扩展，寻找所有相似的深色格子
 * 
 * @param {number} startX - 起始格子X坐标
 * @param {number} startY - 起始格子Y坐标
 * @param {Array} gridInfo - 所有格子的颜色信息
 * @param {number} targetSize - 网格尺寸
 * @param {Array} seedColor - 种子颜色（RGB数组）
 * @returns {Object} - { visited: Set, totalDarkArea: number }
 */
function regionGrowing(startX, startY, gridInfo, targetSize, seedColor) {
  const visited = new Set();
  const queue = [];
  let totalDarkArea = 0;
  
  // 添加起始格子到队列
  queue.push({ x: startX, y: startY });
  
  while (queue.length > 0) {
    const { x, y } = queue.shift();
    const key = `${x},${y}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    const cell = gridInfo[y][x];
    
    // 累加深色面积
    totalDarkArea += cell.darkRatio;
    
    // 8连通：检查周围8个格子
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = x + dx;
        const ny = y + dy;
        
        // 检查边界
        if (nx < 0 || nx >= targetSize || ny < 0 || ny >= targetSize) continue;
        
        const neighborKey = `${nx},${ny}`;
        if (visited.has(neighborKey)) continue;
        
        const neighbor = gridInfo[ny][nx];
        
        // 如果邻居格子也有深色
        if (neighbor.hasDark) {
          // 检查颜色相似度
          const ciedeDist = ciede2000(seedColor, neighbor.darkestColor.rgb);
          
          // 如果颜色相似（ΔE00 < 阈值），加入队列继续扩展
          if (ciedeDist < CONFIG.COLOR_SIMILARITY_THRESHOLD) {
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }
  }
  
  return { visited, totalDarkArea };
}

/**
 * 决定格子的最终颜色
 * 结合深色检测和区域生长
 */
function decideCellColor(x, y, gridInfo, targetSize, visitedCells) {
  const cell = gridInfo[y][x];
  
  // 如果没有深色，直接用主导颜色
  if (!cell.hasDark) {
    return cell.colors[0].rgb;
  }
  
  // 如果已经有深色但被其他区域生长覆盖，跳过
  if (visitedCells.has(`${x},${y}`)) {
    return null; // 稍后处理
  }
  
  // 如果深色占比已经够高（>=面积阈值），直接用深色
  if (cell.darkRatio >= CONFIG.AREA_THRESHOLD) {
    return cell.darkestColor.rgb;
  }
  
  // 深色占比低于阈值，触发区域生长
  if (cell.darkRatio < CONFIG.DETAIL_RATIO_THRESHOLD) {
    // 执行区域生长
    const { visited, totalDarkArea } = regionGrowing(
      x, y, gridInfo, targetSize, cell.darkestColor.rgb
    );
    
    // 标记所有访问过的格子
    for (const key of visited) {
      visitedCells.add(key);
    }
    
    // 根据总面积判断
    if (totalDarkArea >= CONFIG.AREA_THRESHOLD) {
      // 细节足够大，保留深色
      return cell.darkestColor.rgb;
    }
  }
  
  // 深色占比介于阈值之间，直接用深色
  return cell.darkestColor.rgb;
}

// ==================== 主函数 ====================

/**
 * 将图片转换为像素网格
 * 使用CCA + Region Growing算法智能识别细节
 */
export function calculateGridColorsByUniquePrinciple(data, width, height, targetSize) {
  // Step 1: 将原图缩放到targetSize×targetSize（高质量缩放）
  const scaleX = width / targetSize;
  const scaleY = height / targetSize;
  
  // Step 2: 提取每个格子的颜色信息
  const gridInfo = [];
  
  for (let y = 0; y < targetSize; y++) {
    const row = [];
    for (let x = 0; x < targetSize; x++) {
      // 计算格子在原图中的像素范围
      const xStart = Math.floor(x * scaleX);
      const xEnd = Math.floor((x + 1) * scaleX);
      let yStart = Math.floor(y * scaleY);
      let yEnd = Math.floor((y + 1) * scaleY);
      
      // 确保至少有一个像素
      if (yEnd <= yStart) yEnd = yStart + 1;
      yEnd = Math.min(yEnd, height);
      yStart = Math.min(yStart, height - 1);
      
      // 提取颜色信息
      const colorInfo = extractColorsInCell(data, width, xStart, xEnd, yStart, yEnd);
      
      // 计算深色信息
      const darkRatio = getDarkRatio(colorInfo);
      const darkestColor = getDarkestColor(colorInfo);
      const hasDark = colorInfo.colors.some(c => c.isDark);
      
      row.push({
        x,
        y,
        colors: colorInfo.colors,
        totalPixels: colorInfo.totalPixels,
        darkRatio,
        darkestColor,
        hasDark,
        dominantColor: colorInfo.colors.length > 0 ? colorInfo.colors[0].rgb : null
      });
    }
    gridInfo.push(row);
  }
  
  // Step 3: 使用区域生长决定最终颜色
  const visitedCells = new Set();
  const grid = [];
  
  for (let y = 0; y < targetSize; y++) {
    const row = [];
    for (let x = 0; x < targetSize; x++) {
      // 如果已经被其他区域覆盖，跳过
      if (visitedCells.has(`${x},${y}`)) {
        // 找邻居格子中已被标记的颜色
        let useColor = null;
        for (let dy = -1; dy <= 1 && !useColor; dy++) {
          for (let dx = -1; dx <= 1 && !useColor; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < targetSize && ny >= 0 && ny < targetSize) {
              const neighborKey = `${nx},${ny}`;
              if (visitedCells.has(neighborKey)) {
                useColor = gridInfo[ny][nx].finalColor;
              }
            }
          }
        }
        row.push(useColor ? {
          id: '',
          name: '',
          hex: rgbToHex(useColor),
          rgb: useColor
        } : null);
        continue;
      }
      
      const cell = gridInfo[y][x];
      
      // 如果没有颜色信息
      if (!cell.dominantColor) {
        row.push(null);
        continue;
      }
      
      // 决定最终颜色
      let finalColor = null;
      
      if (!cell.hasDark) {
        // 没有深色，直接用主导颜色
        finalColor = cell.dominantColor;
      } else if (cell.darkRatio >= CONFIG.AREA_THRESHOLD) {
        // 深色占比已经够高
        finalColor = cell.darkestColor.rgb;
      } else {
        // 需要区域生长
        const { visited, totalDarkArea } = regionGrowing(
          x, y, gridInfo, targetSize, cell.darkestColor.rgb
        );
        
        // 标记所有访问过的格子，并记录最终颜色
        for (const key of visited) {
          visitedCells.add(key);
        }
        
        // 存储最终颜色到每个格子
        for (const key of visited) {
          const [vx, vy] = key.split(',').map(Number);
          gridInfo[vy][vx].finalColor = cell.darkestColor.rgb;
        }
        
        if (totalDarkArea >= CONFIG.AREA_THRESHOLD) {
          finalColor = cell.darkestColor.rgb;
        } else {
          finalColor = cell.dominantColor;
        }
      }
      
      if (finalColor) {
        row.push({
          id: '',
          name: '',
          hex: rgbToHex(finalColor),
          rgb: finalColor
        });
      } else {
        row.push(null);
      }
    }
    grid.push(row);
  }
  
  // Step 4: 颜色量化（直接使用RGB值）
  const quantizedGrid = quantizeColorsSimple(grid);
  
  // Step 5: 统计颜色使用
  const colors = new Map();
  for (const row of quantizedGrid) {
    for (const cell of row) {
      if (cell && cell.id) {
        if (!colors.has(cell.id)) {
          colors.set(cell.id, { color: cell, count: 0 });
        }
        colors.get(cell.id).count++;
      }
    }
  }
  
  return { grid: quantizedGrid, colors };
}

/**
 * 颜色量化函数 - 直接使用RGB值
 */
function quantizeColorsSimple(grid) {
  const colorMap = new Map();
  let colorIndex = 0;
  
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cell = grid[y][x];
      if (!cell || !cell.rgb) continue;
      
      const rgbStr = cell.rgb.join(',');
      
      if (!colorMap.has(rgbStr)) {
        colorIndex++;
        colorMap.set(rgbStr, {
          id: generateColorId(colorIndex),
          name: `颜色${colorIndex}`,
          rgb: cell.rgb,
          hex: cell.hex
        });
      }
      
      grid[y][x].id = colorMap.get(rgbStr).id;
      grid[y][x].name = colorMap.get(rgbStr).name;
      grid[y][x].hex = colorMap.get(rgbStr).hex;
      grid[y][x].rgb = colorMap.get(rgbStr).rgb;
    }
  }
  
  return grid;
}

/**
 * 生成颜色ID
 */
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
