// 颜色工具函数

// RGB转HSL
export function rgbToHsl(rgb) {
  if (!rgb || !Array.isArray(rgb) || rgb.length !== 3) {
    return [0, 0, 50]; // 默认返回灰色
  }
  
  const [r, g, b] = rgb.map(v => v / 255);
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return [h * 360, s * 100, l * 100];
}

// HSL转RGB
export function hslToRgb(hsl) {
  if (!hsl || !Array.isArray(hsl) || hsl.length !== 3) {
    return [128, 128, 128]; // 默认返回灰色
  }
  
  const [h, s, l] = hsl.map((v, i) => i === 0 ? v / 360 : v / 100);
  
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

// 生成渐变色（从深到浅）
export function generateShades(rgb, count = 11) {
  if (!rgb || !Array.isArray(rgb) || rgb.length !== 3) {
    // 如果rgb无效，返回默认灰色渐变色
    return Array(count).fill([128, 128, 128]);
  }
  
  const [h, s] = rgbToHsl(rgb);
  const shades = [];
  
  for (let i = 0; i < count; i++) {
    const l = 5 + (95 - 5) * (i / (count - 1)); // L: 5% → 95%
    shades.push(hslToRgb([h, s, l]));
  }
  
  return shades;
}

// RGB转Hex
export function rgbToHex(rgb) {
  return `#${((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1).toUpperCase()}`;
}

// Hex转RGB
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

// 颜色是否相等
export function isColorEqual(rgb1, rgb2) {
  if (!rgb1 || !rgb2) return false;
  return rgb1[0] === rgb2[0] && rgb1[1] === rgb2[1] && rgb1[2] === rgb2[2];
}

// 获取图纸所有唯一颜色
export function getUniqueColors(grid) {
  const colors = new Map();
  
  for (const row of grid) {
    for (const cell of row) {
      if (cell && cell.rgb) {
        const key = cell.rgb.join(',');
        if (!colors.has(key)) {
          colors.set(key, cell.rgb);
        }
      }
    }
  }
  
  return Array.from(colors.values());
}

// 按RGB值排序
export function sortColorsByRgb(colors) {
  return [...colors].sort((a, b) => {
    const aVal = a[0] * 1000000 + a[1] * 1000 + a[2];
    const bVal = b[0] * 1000000 + b[1] * 1000 + b[2];
    return aVal - bVal;
  });
}

// 合并并去重颜色（渐变色在前）
export function mergeAndDedupeColors(shadeColors, allColors) {
  const seen = new Set();
  const result = [];
  
  // 先添加渐变色
  for (const color of shadeColors) {
    const key = color.join(',');
    if (!seen.has(key)) {
      seen.add(key);
      result.push(color);
    }
  }
  
  // 再添加图纸颜色（排除已在渐变色中的）
  for (const color of allColors) {
    const key = color.join(',');
    if (!seen.has(key)) {
      seen.add(key);
      result.push(color);
    }
  }
  
  return result;
}

// 获取对比色（用于文字显示）
export function getContrastColor(rgb) {
  const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

// 生成彩虹渐变色CSS
export function generateRainbowGradient() {
  const stops = [];
  for (let i = 0; i <= 360; i += 30) {
    stops.push(`hsl(${i}, 100%, 50%)`);
  }
  return `linear-gradient(to right, ${stops.join(', ')})`;
}