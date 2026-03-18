import { perlerColors, directColorMatch, colorDistance } from './perlerColors.js';

// 将图片数据转换为像素网格
export function imageToPixelGrid(imageData, width, height, colorCount, targetSize = 80) {
  const data = imageData.data;
  const grid = [];
  
  // 根据目标拼豆尺寸动态调整处理分辨率
  // 小尺寸时使用更高的分辨率，保留更多细节
  let maxDimension;
  if (targetSize <= 30) {
    // 小尺寸拼豆，使用更高分辨率
    maxDimension = 200;
  } else if (targetSize <= 50) {
    // 中等尺寸拼豆
    maxDimension = 180;
  } else {
    // 大尺寸拼豆
    maxDimension = 150;
  }
  
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const scaledWidth = Math.floor(width * scale);
  const scaledHeight = Math.floor(height * scale);
  
  // 颜色量化：减少颜色种类
  const colorMap = new Map();
  const quantizedColors = new Map();
  
  // 第一步：收集所有颜色并统计频率
  const allColors = [];
  for (let y = 0; y < scaledHeight; y++) {
    for (let x = 0; x < scaledWidth; x++) {
      const originalX = Math.floor(x / scale);
      const originalY = Math.floor(y / scale);
      const i = (originalY * width + originalX) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a < 128) continue;
      
      const rgbKey = `${r},${g},${b}`;
      if (!colorMap.has(rgbKey)) {
        colorMap.set(rgbKey, { rgb: [r, g, b], count: 0 });
        allColors.push([r, g, b]);
      }
      colorMap.get(rgbKey).count++;
    }
  }
  
  // 第二步：颜色量化 - 使用K-means算法减少颜色种类
  // 使用确定性种子，确保结果可重现
  const centroids = kMeans(allColors, colorCount, 42);
  
  // 第三步：为每个颜色分配最接近的中心点
  for (const [rgbKey, { rgb, count }] of colorMap.entries()) {
    const closestCentroid = findClosestCentroid(rgb, centroids);
    const centroidKey = `${closestCentroid[0]},${closestCentroid[1]},${closestCentroid[2]}`;
    if (!quantizedColors.has(centroidKey)) {
      quantizedColors.set(centroidKey, { rgb: closestCentroid, count: 0 });
    }
    quantizedColors.get(centroidKey).count += count;
  }
  
  // 第四步：生成颜色ID映射
  const colorIdMap = new Map();
  let colorIndex = 1;
  for (const [centroidKey, { rgb }] of quantizedColors.entries()) {
    // 生成简短的颜色ID
    const id = generateShortColorId(colorIndex);
    colorIdMap.set(centroidKey, {
      id,
      rgb,
      hex: `#${((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1).toUpperCase()}`
    });
    colorIndex++;
  }
  
  // 第五步：构建网格并应用空间平滑
  const rawGrid = [];
  for (let y = 0; y < scaledHeight; y++) {
    const row = [];
    for (let x = 0; x < scaledWidth; x++) {
      const originalX = Math.floor(x / scale);
      const originalY = Math.floor(y / scale);
      const i = (originalY * width + originalX) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a < 128) {
        row.push(null);
        continue;
      }
      
      const closestCentroid = findClosestCentroid([r, g, b], centroids);
      const centroidKey = `${closestCentroid[0]},${closestCentroid[1]},${closestCentroid[2]}`;
      const colorInfo = colorIdMap.get(centroidKey);
      
      row.push({
        id: colorInfo.id,
        name: `颜色 ${colorInfo.id}`,
        hex: colorInfo.hex,
        rgb: colorInfo.rgb
      });
    }
    rawGrid.push(row);
  }
  
  // 第六步：应用空间平滑，保持边缘连贯性
  const smoothedGrid = applySpatialSmoothing(rawGrid);
  
  // 统计最终颜色
  const finalColorMap = new Map();
  for (const row of smoothedGrid) {
    for (const cell of row) {
      if (cell) {
        const key = cell.id;
        if (!finalColorMap.has(key)) {
          finalColorMap.set(key, { color: cell, count: 0 });
        }
        finalColorMap.get(key).count++;
      }
    }
  }
  
  return { grid: smoothedGrid, colors: finalColorMap };
}

// 应用空间平滑，保持边缘连贯性
function applySpatialSmoothing(grid) {
  const height = grid.length;
  if (height === 0) return grid;
  
  const width = grid[0].length;
  const result = JSON.parse(JSON.stringify(grid));
  
  // 对每个像素应用平滑
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!result[y][x]) continue;
      
      // 计算周围像素的颜色分布
      const neighborColors = new Map();
      let totalWeight = 0;
      
      // 5x5邻域，增加平滑范围
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width && grid[ny][nx]) {
            const colorId = grid[ny][nx].id;
            const distance = Math.abs(dx) + Math.abs(dy);
            const weight = 1 / (distance + 1); // 距离越近权重越大
            neighborColors.set(colorId, (neighborColors.get(colorId) || 0) + weight);
            totalWeight += weight;
          }
        }
      }
      
      // 找到最主要的颜色
      if (neighborColors.size > 0) {
        let maxWeight = 0;
        let dominantColor = result[y][x];
        
        for (const [colorId, weight] of neighborColors.entries()) {
          if (weight > maxWeight) {
            maxWeight = weight;
            // 找到对应的颜色对象
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                const ny = y + dy;
                const nx = x + dx;
                if (ny >= 0 && ny < height && nx >= 0 && nx < width && 
                    grid[ny][nx] && grid[ny][nx].id === colorId) {
                  dominantColor = grid[ny][nx];
                  break;
                }
              }
            }
          }
        }
        
        // 降低阈值，增加平滑强度
        if (maxWeight / totalWeight > 0.3) {
          result[y][x] = dominantColor;
        }
      }
    }
  }
  
  // 第二次平滑，进一步增强连贯性
  const secondPass = JSON.parse(JSON.stringify(result));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!secondPass[y][x]) continue;
      
      // 计算周围像素的颜色分布
      const neighborColors = new Map();
      let totalWeight = 0;
      
      // 3x3邻域
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width && secondPass[ny][nx]) {
            const colorId = secondPass[ny][nx].id;
            const weight = 1 / (Math.abs(dx) + Math.abs(dy) + 1);
            neighborColors.set(colorId, (neighborColors.get(colorId) || 0) + weight);
            totalWeight += weight;
          }
        }
      }
      
      // 找到最主要的颜色
      if (neighborColors.size > 0) {
        let maxWeight = 0;
        let dominantColor = secondPass[y][x];
        
        for (const [colorId, weight] of neighborColors.entries()) {
          if (weight > maxWeight) {
            maxWeight = weight;
            // 找到对应的颜色对象
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const ny = y + dy;
                const nx = x + dx;
                if (ny >= 0 && ny < height && nx >= 0 && nx < width && 
                    secondPass[ny][nx] && secondPass[ny][nx].id === colorId) {
                  dominantColor = secondPass[ny][nx];
                  break;
                }
              }
            }
          }
        }
        
        // 再次平滑
        if (maxWeight / totalWeight > 0.4) {
          secondPass[y][x] = dominantColor;
        }
      }
    }
  }
  
  return secondPass;
}

// 生成简短的颜色ID
function generateShortColorId(index) {
  // 使用字母+数字的组合，确保ID简短
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

// K-means聚类算法
function kMeans(colors, k, seed = 42) {
  // 使用种子确保结果可重现
  function seededRandom(seed) {
    let s = seed;
    return function() {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
  
  const random = seededRandom(seed);
  
  // 随机初始化中心点
  const centroids = [];
  const usedIndices = new Set();
  
  for (let i = 0; i < k; i++) {
    let randomIndex;
    do {
      randomIndex = Math.floor(random() * colors.length);
    } while (usedIndices.has(randomIndex));
    usedIndices.add(randomIndex);
    centroids.push([...colors[randomIndex]]);
  }
  
  let converged = false;
  const maxIterations = 10;
  let iterations = 0;
  
  while (!converged && iterations < maxIterations) {
    // 分配每个颜色到最近的中心点
    const clusters = Array(k).fill().map(() => []);
    
    for (const color of colors) {
      const closestIndex = findClosestCentroidIndex(color, centroids);
      clusters[closestIndex].push(color);
    }
    
    // 更新中心点
    const newCentroids = [];
    for (const cluster of clusters) {
      if (cluster.length === 0) {
        // 如果聚类为空，使用种子随机重新初始化
        newCentroids.push(colors[Math.floor(random() * colors.length)]);
      } else {
        const sum = cluster.reduce((acc, color) => {
          return [acc[0] + color[0], acc[1] + color[1], acc[2] + color[2]];
        }, [0, 0, 0]);
        newCentroids.push([
          Math.round(sum[0] / cluster.length),
          Math.round(sum[1] / cluster.length),
          Math.round(sum[2] / cluster.length)
        ]);
      }
    }
    
    // 检查是否收敛
    converged = true;
    for (let i = 0; i < k; i++) {
      if (Math.abs(centroids[i][0] - newCentroids[i][0]) > 1 ||
          Math.abs(centroids[i][1] - newCentroids[i][1]) > 1 ||
          Math.abs(centroids[i][2] - newCentroids[i][2]) > 1) {
        converged = false;
        break;
      }
    }
    
    centroids.splice(0, centroids.length, ...newCentroids);
    iterations++;
  }
  
  return centroids;
}

// 找到最接近的中心点
function findClosestCentroid(rgb, centroids) {
  let minDistance = Infinity;
  let closestCentroid = centroids[0];
  
  for (const centroid of centroids) {
    const distance = colorDistance(rgb, centroid);
    if (distance < minDistance) {
      minDistance = distance;
      closestCentroid = centroid;
    }
  }
  
  return closestCentroid;
}

// 找到最接近的中心点索引
function findClosestCentroidIndex(rgb, centroids) {
  let minDistance = Infinity;
  let closestIndex = 0;
  
  for (let i = 0; i < centroids.length; i++) {
    const distance = colorDistance(rgb, centroids[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }
  
  return closestIndex;
}

// 从 Canvas 获取图片数据
export function getImageDataFromCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}