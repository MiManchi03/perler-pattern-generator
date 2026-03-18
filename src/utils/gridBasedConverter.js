// 拼豆图纸转换器 - CCA + 形状分析算法 (最终版)
// 核心：4连通检测 + 形状分析分割 + 空间隔离

import { perlerColors, colorDistance, ciede2000, findClosestColor } from './perlerColors.js';
export { perlerColors, colorDistance, ciede2000, findClosestColor };

// ==================== 配置参数 ====================
const CONFIG = {
  // 深色阈值（亮度0-255）
  DARK_LUMINANCE_THRESHOLD: 80,
  
  // 区域面积阈值（25%）
  AREA_THRESHOLD: 0.25,
  
  // 格子中深色占比阈值（10%）
  MIN_RATIO_IN_REGION: 0.10,
  
  // 颜色相似度阈值（ΔE00 < 20）
  COLOR_VARIATION_THRESHOLD: 20,
  
  // 连通性：8连通（包括对角线，用于检测环形眼镜框）
  CONNECTIVITY: 8,
  
  // 形状分割阈值：宽高比 < 此值时触发分割
  SHAPE_MIN_RATIO: 0.4,
  
  // 形状分析最小格子数：至少此数量的格子才进行形状分析
  SHAPE_MIN_CELLS: 3,
  
  // 紧凑度阈值：面积/边界比 < 此值时触发分割
  SHAPE_MIN_COMPACTNESS: 0.6,
  
  // 最小行/列占比：最窄行/列格子数 < 平均值×此值时触发分割
  SHAPE_MIN_ROW_RATIO: 0.4,
  
  // 最小区域格子数：分割后子区域必须>=此值，否则忽略（过滤"流泪"）
  MIN_REGION_CELLS: 2,
  
  // 环形检测：启用眼镜框等环形结构检测
  RING_DETECTION: true,
  
  // 孤立区域忽略阈值：格子数 < 此值被认为是噪声/延伸
  ISOLATED_IGNORE_THRESHOLD: 2
};

// ==================== 辅助函数 ====================
function getLuminance(rgb) {
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
}

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
  
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3];
      
      if (alpha < 64) continue;
      
      const rgb = [data[i], data[i + 1], data[i + 2]];
      const rgbStr = rgb.join(',');
      
      const currentCount = colorCounts.get(rgbStr) || 0;
      colorCounts.set(rgbStr, currentCount + 1);
      totalPixels++;
    }
  }
  
  if (totalPixels === 0) {
    return { colors: [], totalPixels: 0, darkRatio: 0, darkestColor: null, hasDark: false, dominantColor: null };
  }
  
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
  
  colors.sort((a, b) => b.count - a.count);
  
  let darkRatio = 0;
  let darkestColor = null;
  let minLuminance = Infinity;
  
  for (const c of colors) {
    if (c.isDark) {
      darkRatio += c.ratio;
      if (c.luminance < minLuminance) {
        minLuminance = c.luminance;
        darkestColor = c;
      }
    }
  }
  
  return {
    colors,
    totalPixels,
    darkRatio,
    darkestColor,
    hasDark: darkRatio > 0,
    dominantColor: colors.length > 0 ? colors[0].rgb : null
  };
}

/**
 * 8连通CCA检测 - 包括对角线相邻格子（用于检测环形眼镜框）
 */
function findConnectedComponents(gridInfo, targetSize) {
  const visited = new Set();
  const components = [];
  
  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const key = `${x},${y}`;
      
      if (visited.has(key) || !gridInfo[y][x].hasDark) continue;
      
      const component = [];
      const queue = [{ x, y }];
      visited.add(key);
      
      while (queue.length > 0) {
        const { x: cx, y: cy } = queue.shift();
        const cell = gridInfo[cy][cx];
        
        component.push({ x: cx, y: cy, cell });
        
        // 8连通：包括上下左右和对角线
        const directions = [
          { dx: 0, dy: -1 },  // 上
          { dx: 0, dy: 1 },   // 下
          { dx: -1, dy: 0 },  // 左
          { dx: 1, dy: 0 },   // 右
          { dx: -1, dy: -1 }, // 左上
          { dx: 1, dy: -1 },  // 右上
          { dx: -1, dy: 1 },  // 左下
          { dx: 1, dy: 1 }    // 右下
        ];
        
        for (const { dx, dy } of directions) {
          const nx = cx + dx;
          const ny = cy + dy;
          
          if (nx < 0 || nx >= targetSize || ny < 0 || ny >= targetSize) continue;
          
          const neighborKey = `${nx},${ny}`;
          if (visited.has(neighborKey)) continue;
          
          if (gridInfo[ny][nx].hasDark) {
            visited.add(neighborKey);
            queue.push({ x: nx, y: ny });
          }
        }
      }
      
      components.push(component);
    }
  }
  
  return components;
}

/**
 * 计算连通区域信息
 */
function calculateComponentInfo(component) {
  let totalDarkArea = 0;
  let minLuminance = Infinity;
  let deepestColor = null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  for (const { x, y, cell } of component) {
    totalDarkArea += cell.darkRatio;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    
    if (cell.darkestColor && cell.darkestColor.luminance < minLuminance) {
      minLuminance = cell.darkestColor.luminance;
      deepestColor = cell.darkestColor;
    }
  }
  
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const area = width * height;
  const cellCount = component.length;
  
  // 计算紧凑度 = 实际格子数 / 外接矩形面积
  const compactness = cellCount / area;
  
  // 计算宽高比（取较小的比值作为参考）
  const aspectRatio = cellCount > 1 ? 
    Math.min(width / height, height / width) : 1;
  
  // 计算每行和每列的格子数，用于检测"腰"
  const rowCounts = new Array(height).fill(0);
  const colCounts = new Array(width).fill(0);
  
  for (const { x, y } of component) {
    rowCounts[y - minY]++;
    colCounts[x - minX]++;
  }
  
  // 找到最窄的行和列
  let minRowCount = Infinity, maxRowCount = 0;
  let minColCount = Infinity, maxColCount = 0;
  
  for (const count of rowCounts) {
    minRowCount = Math.min(minRowCount, count);
    maxRowCount = Math.max(maxRowCount, count);
  }
  
  for (const count of colCounts) {
    minColCount = Math.min(minColCount, count);
    maxColCount = Math.max(maxColCount, count);
  }
  
  // 计算最窄行/列占总格子数的比例
  const minRowRatio = maxRowCount > 0 ? minRowCount / maxRowCount : 1;
  const minColRatio = maxColCount > 0 ? minColCount / maxColCount : 1;
  
  // 计算平均每行的格子数
  const avgRowCount = cellCount / height;
  const avgColCount = cellCount / width;
  
  return {
    totalDarkArea,
    totalCells: cellCount,
    deepestColor,
    boundingBox: { minX, maxX, minY, maxY },
    width,
    height,
    area,
    compactness,
    aspectRatio,
    minRowCount,
    maxRowCount,
    minColCount,
    maxColCount,
    minRowRatio,
    minColRatio,
    avgRowCount,
    avgColCount,
    rowCounts,
    colCounts
  };
}

/**
 * 形状分析 - 直接过滤孤立格子（解决"流泪"问题）
 * 核心思路：如果检测到孤立延伸，直接从组件中移除，而不是尝试分割
 */
function analyzeAndSplitShape(component) {
  // 检查是否有孤立延伸
  if (component.length >= 4) {
    const isolatedCells = findIsolatedCells(component);
    
    if (isolatedCells.length > 0) {
      console.log(`[形状分析] 检测到${isolatedCells.length}个孤立格子`);
      
      // 从组件中移除孤立格子
      const validComponent = component.filter(cell => {
        const key = `${cell.x},${cell.y}`;
        return !isolatedCells.some(iso => `${iso.x},${iso.y}` === key);
      });
      
      console.log(`[形状分析] 移除孤立格子后: ${validComponent.length}个格子`);
      
      // 如果移除后还剩足够的格子，返回新组件
      if (validComponent.length >= CONFIG.MIN_REGION_CELLS) {
        return [validComponent];
      }
    }
  }
  
  return [component];
}

/**
 * 找到区域中的孤立格子
 * 孤立格子定义：在区域中只有 <= 2个邻居的格子
 */
function findIsolatedCells(component) {
  if (component.length < 4) return [];
  
  // 统计每个格子在区域中的邻居数
  const neighborCount = new Map();
  for (const { x, y } of component) {
    neighborCount.set(`${x},${y}`, 0);
  }
  
  for (const { x, y } of component) {
    for (const other of component) {
      if (other.x === x && other.y === y) continue;
      // 检查是否相邻（8连通）
      const dx = Math.abs(other.x - x);
      const dy = Math.abs(other.y - y);
      if (dx <= 1 && dy <= 1) {
        neighborCount.set(`${x},${y}`, neighborCount.get(`${x},${y}`) + 1);
      }
    }
  }
  
  // 找到孤立格子（邻居数 <= 2）
  const isolatedCells = [];
  for (const { x, y } of component) {
    const count = neighborCount.get(`${x},${y}`);
    if (count <= 2) {
      isolatedCells.push({ x, y, neighbors: count });
    }
  }
  
  // 如果找到孤立格子，按邻居数升序排序（最孤立的排在前面）
  isolatedCells.sort((a, b) => a.neighbors - b.neighbors);
  
  return isolatedCells;
}

/**
 * 在"腰"处分割连通区域（简化版，仅在需要时使用）
 */
function trySplitByWaist(component, info) {
  const { minX, maxX, minY, maxY, rowCounts, colCounts } = info;
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  
  // 找到最窄的行和列（腰）
  let minRowCount = Infinity, minRowIdx = -1;
  let minColCount = Infinity, minColIdx = -1;
  
  for (let i = 0; i < rowCounts.length; i++) {
    if (rowCounts[i] < minRowCount && rowCounts[i] > 0) {
      minRowCount = rowCounts[i];
      minRowIdx = i;
    }
  }
  
  for (let i = 0; i < colCounts.length; i++) {
    if (colCounts[i] < minColCount && colCounts[i] > 0) {
      minColCount = colCounts[i];
      minColIdx = i;
    }
  }
  
  // 判断应该按行分割还是按列分割
  // 选择格子数最少的方向分割
  let splitA = [];
  let splitB = [];
  
  // 首先尝试按行分割
  if (rowCounts.length > 1) {
    const splitY = minY + minRowIdx;
    
    for (const { x, y, cell } of component) {
      if (y < splitY) {
        splitA.push({ x, y, cell });
      } else {
        splitB.push({ x, y, cell });
      }
    }
    
    // 检查分割是否合理：每个子区域至少要有一定数量的格子
    // 并且每个子区域的紧凑度要比原区域好
    if (splitA.length >= 1 && splitB.length >= 1) {
      // 检查分割后的子区域是否比原区域更紧凑
      const compactA = splitA.length / (splitA.length); // 简化计算
      const compactB = splitB.length / (splitB.length);
      
      // 要求两个子区域都满足最小格子数阈值
      // 如果任意一个子区域 < MIN_REGION_CELLS(2)，这个子区域将被过滤
      if (splitA.length >= CONFIG.MIN_REGION_CELLS && splitB.length >= CONFIG.MIN_REGION_CELLS) {
        console.log(`[分割] 按行分割成功: A=${splitA.length}格子, B=${splitB.length}格子`);
        return [splitA, splitB];
      }
    }
  }
  
  // 尝试按列分割
  splitA = [];
  splitB = [];
  
  if (colCounts.length > 1) {
    const splitX = minX + minColIdx;
    
    for (const { x, y, cell } of component) {
      if (x < splitX) {
        splitA.push({ x, y, cell });
      } else {
        splitB.push({ x, y, cell });
      }
    }
    
    if (splitA.length >= CONFIG.MIN_REGION_CELLS && splitB.length >= CONFIG.MIN_REGION_CELLS) {
      console.log(`[分割] 按列分割成功: A=${splitA.length}格子, B=${splitB.length}格子`);
      return [splitA, splitB];
    }
  }
  
  return [component]; // 分割失败，返回原组件
}

/**
 * 检测环形结构（如眼镜框）
 * 环形特征：
 * 1. 外接矩形四个角都有深色
 * 2. 外接矩形中心有非深色区域（空洞）
 * 3. 区域的形状接近矩形/正方形
 */
function detectRingShape(component, info, gridInfo, targetSize) {
  const { minX, maxX, minY, maxY, width, height } = info;
  
  // 如果外接矩形太小（< 2x2），不可能是环形
  if (width < 2 || height < 2) {
    return false;
  }
  
  // 检查四个角是否都有深色
  const corners = [
    { x: minX, y: minY },           // 左上
    { x: maxX, y: minY },           // 右上
    { x: minX, y: maxY },           // 左下
    { x: maxX, y: maxY }            // 右下
  ];
  
  let cornersWithDark = 0;
  for (const { x, y } of corners) {
    if (gridInfo[y] && gridInfo[y][x] && gridInfo[y][x].hasDark) {
      cornersWithDark++;
    }
  }
  
  // 如果至少3个角有深色，可能是一个环形
  if (cornersWithDark >= 3) {
    // 检查中心区域是否有非深色（空洞）
    const centerMinX = minX + 1;
    const centerMaxX = maxX - 1;
    const centerMinY = minY + 1;
    const centerMaxY = maxY - 1;
    
    let centerDarkCount = 0;
    let centerTotalCount = 0;
    
    for (let y = centerMinY; y <= centerMaxY; y++) {
      for (let x = centerMinX; x <= centerMaxX; x++) {
        if (y >= 0 && y < targetSize && x >= 0 && x < targetSize) {
          centerTotalCount++;
          if (gridInfo[y][x].hasDark) {
            centerDarkCount++;
          }
        }
      }
    }
    
    // 如果中心区域存在且深色占比 < 50%，认为是环形
    if (centerTotalCount > 0) {
      const centerDarkRatio = centerDarkCount / centerTotalCount;
      if (centerDarkRatio < 0.5) {
        return true;
      }
    } else if (width >= 3 || height >= 3) {
      // 中心区域为空（比如1格宽的框），也是环形
      return true;
    }
  }
  
  return false;
}

/**
 * 空间隔离检查 - 确保五官不会连在一起
 */
function checkSpatialIsolation(components, gridInfo, targetSize) {
  const result = [];
  
  for (const component of components) {
    // 先检测是否是环形结构（如眼镜框）
    const info = calculateComponentInfo(component);
    
    if (CONFIG.RING_DETECTION && detectRingShape(component, info, gridInfo, targetSize)) {
      console.log(`[环形检测] 检测到眼镜框，格子数=${component.length}`);
      // 环形结构直接保留，不进行分割
      result.push(component);
      continue;
    }
    
    // 先进行形状分析（可能分割）
    const splitComponents = analyzeAndSplitShape(component);
    
    for (const split of splitComponents) {
      const splitInfo = calculateComponentInfo(split);
      
      // 检查这个区域是否应该保留
      // 条件：总深色面积 >= 阈值
      if (splitInfo.totalDarkArea >= CONFIG.AREA_THRESHOLD) {
        result.push(split);
      }
    }
  }
  
  return result;
}

// ==================== 主函数 ====================

export function calculateGridColorsByUniquePrinciple(data, width, height, targetSize) {
  // Step 1: 计算缩放比例
  const scaleX = width / targetSize;
  const scaleY = height / targetSize;
  
  // Step 2: 提取每个格子的颜色信息
  const gridInfo = [];
  
  for (let y = 0; y < targetSize; y++) {
    const row = [];
    for (let x = 0; x < targetSize; x++) {
      const xStart = Math.floor(x * scaleX);
      const xEnd = Math.floor((x + 1) * scaleX);
      let yStart = Math.floor(y * scaleY);
      let yEnd = Math.floor((y + 1) * scaleY);
      
      if (yEnd <= yStart) yEnd = yStart + 1;
      yEnd = Math.min(yEnd, height);
      yStart = Math.min(yStart, height - 1);
      
      const colorInfo = extractColorsInCell(data, width, xStart, xEnd, yStart, yEnd);
      
      row.push({
        x,
        y,
        ...colorInfo
      });
    }
    gridInfo.push(row);
  }
  
  // Step 3: 4连通CCA检测
  const rawComponents = findConnectedComponents(gridInfo, targetSize);
  
  // Step 4: 空间隔离检查 + 形状分析
  const validComponents = checkSpatialIsolation(rawComponents, gridInfo, targetSize);
  
  // Step 5: 决定每个格子的最终颜色
  const processedCells = new Set();
  const cellFinalColor = new Map();
  
  for (const component of validComponents) {
    const info = calculateComponentInfo(component);
    const regionColor = info.deepestColor ? info.deepestColor.rgb : component[0].cell.dominantColor;
    
    for (const { x, y, cell } of component) {
      const key = `${x},${y}`;
      
      if (processedCells.has(key)) continue;
      processedCells.add(key);
      
      // 验证格子是否真正属于这个区域
      if (cell.darkRatio >= CONFIG.MIN_RATIO_IN_REGION) {
        // 深色占比足够
        const cellColor = cell.darkestColor ? cell.darkestColor.rgb : regionColor;
        cellFinalColor.set(key, cellColor);
      } else {
        // 需要检查颜色相似度
        const cellDarkColor = cell.darkestColor ? cell.darkestColor.rgb : cell.dominantColor;
        const ciedeDist = ciede2000(regionColor, cellDarkColor);
        
        if (ciedeDist < CONFIG.COLOR_VARIATION_THRESHOLD) {
          cellFinalColor.set(key, cellDarkColor);
        } else {
          cellFinalColor.set(key, cell.dominantColor);
        }
      }
    }
  }
  
  // Step 6: 生成最终网格
  const grid = [];
  
  for (let y = 0; y < targetSize; y++) {
    const row = [];
    for (let x = 0; x < targetSize; x++) {
      const key = `${x},${y}`;
      const cell = gridInfo[y][x];
      
      if (!cell.dominantColor) {
        row.push(null);
        continue;
      }
      
      const finalColor = cellFinalColor.has(key) ? 
        cellFinalColor.get(key) : 
        cell.dominantColor;
      
      row.push({
        id: '',
        name: '',
        hex: rgbToHex(finalColor),
        rgb: finalColor
      });
    }
    grid.push(row);
  }
  
  // Step 7: 颜色量化
  const quantizedGrid = quantizeColorsSimple(grid);
  
  // Step 8: 统计颜色使用
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
 * 颜色量化函数
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
