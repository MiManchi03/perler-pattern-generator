// Perler/Artkal 拼豆色卡 (扩展色卡，增加更多肤色和细腻颜色)
export const perlerColors = [
  { id: 'A01', name: '白色', hex: '#FFFFFF', rgb: [255, 255, 255] },
  { id: 'A02', name: '米白', hex: '#F5F5DC', rgb: [245, 245, 220] },
  { id: 'A03', name: '浅灰', hex: '#D3D3D3', rgb: [211, 211, 211] },
  { id: 'A04', name: '中灰', hex: '#808080', rgb: [128, 128, 128] },
  { id: 'A05', name: '深灰', hex: '#404040', rgb: [64, 64, 64] },
  { id: 'A06', name: '黑色', hex: '#000000', rgb: [0, 0, 0] },
  { id: 'A07', name: '红色', hex: '#FF0000', rgb: [255, 0, 0] },
  { id: 'A08', name: '深红', hex: '#8B0000', rgb: [139, 0, 0] },
  { id: 'A09', name: '粉红', hex: '#FFB6C1', rgb: [255, 182, 193] },
  { id: 'A10', name: '玫红', hex: '#FF1493', rgb: [255, 20, 147] },
  { id: 'A11', name: '橙色', hex: '#FFA500', rgb: [255, 165, 0] },
  { id: 'A12', name: '深橙', hex: '#FF8C00', rgb: [255, 140, 0] },
  { id: 'A13', name: '黄色', hex: '#FFFF00', rgb: [255, 255, 0] },
  { id: 'A14', name: '浅黄', hex: '#FFFFE0', rgb: [255, 255, 224] },
  { id: 'A15', name: '金黄', hex: '#FFD700', rgb: [255, 215, 0] },
  { id: 'A16', name: '棕色', hex: '#8B4513', rgb: [139, 69, 19] },
  { id: 'A17', name: '浅棕', hex: '#D2691E', rgb: [210, 105, 30] },
  { id: 'A18', name: '深棕', hex: '#5C3317', rgb: [92, 51, 23] },
  { id: 'A19', name: '绿色', hex: '#008000', rgb: [0, 128, 0] },
  { id: 'A20', name: '浅绿', hex: '#90EE90', rgb: [144, 238, 144] },
  { id: 'A21', name: '深绿', hex: '#006400', rgb: [0, 100, 0] },
  { id: 'A22', name: '草绿', hex: '#7CFC00', rgb: [124, 252, 0] },
  { id: 'A23', name: '橄榄绿', hex: '#808000', rgb: [128, 128, 0] },
  { id: 'A24', name: '青色', hex: '#00FFFF', rgb: [0, 255, 255] },
  { id: 'A25', name: '浅蓝', hex: '#ADD8E6', rgb: [173, 216, 230] },
  { id: 'A26', name: '蓝色', hex: '#0000FF', rgb: [0, 0, 255] },
  { id: 'A27', name: '深蓝', hex: '#00008B', rgb: [0, 0, 139] },
  { id: 'A28', name: '天蓝', hex: '#87CEEB', rgb: [135, 206, 235] },
  { id: 'A29', name: '宝蓝', hex: '#4169E1', rgb: [65, 105, 225] },
  { id: 'A30', name: '紫色', hex: '#800080', rgb: [128, 0, 128] },
  { id: 'A31', name: '浅紫', hex: '#DDA0DD', rgb: [221, 160, 221] },
  { id: 'A32', name: '深紫', hex: '#4B0082', rgb: [75, 0, 130] },
  { id: 'A33', name: '肤色', hex: '#FFDBAC', rgb: [255, 219, 172] },
  { id: 'A34', name: '深肤色', hex: '#D2B48C', rgb: [210, 180, 140] },
  { id: 'A35', name: '透明', hex: '#F0F8FF', rgb: [240, 248, 255] },
  { id: 'A36', name: '荧光粉', hex: '#FF69B4', rgb: [255, 105, 180] },
  { id: 'A37', name: '荧光绿', hex: '#32CD32', rgb: [50, 205, 50] },
  { id: 'A38', name: '荧光橙', hex: '#FF7F50', rgb: [255, 127, 80] },
  { id: 'A39', name: '荧光黄', hex: '#FAFAD2', rgb: [250, 250, 210] },
  { id: 'A40', name: '珍珠白', hex: '#F8F8FF', rgb: [248, 248, 255] },
  { id: 'A41', name: '银灰', hex: '#C0C0C0', rgb: [192, 192, 192] },
  { id: 'A42', name: '金色', hex: '#DAA520', rgb: [218, 165, 32] },
  { id: 'A43', name: '铜色', hex: '#B87333', rgb: [184, 115, 51] },
  { id: 'A44', name: '薄荷绿', hex: '#98FF98', rgb: [152, 255, 152] },
  { id: 'A45', name: '珊瑚粉', hex: '#FF7F7F', rgb: [255, 127, 127] },
  { id: 'A46', name: '薰衣草', hex: '#E6E6FA', rgb: [230, 230, 250] },
  { id: 'A47', name: '桃红', hex: '#FFC0CB', rgb: [255, 192, 203] },
  { id: 'A48', name: '柠檬黄', hex: '#FFFACD', rgb: [255, 250, 205] },
  { id: 'A49', name: '靛蓝', hex: '#4B0082', rgb: [75, 0, 130] },
  { id: 'A50', name: '酒红', hex: '#722F37', rgb: [114, 47, 55] },
  { id: 'A51', name: '海军蓝', hex: '#001F3F', rgb: [0, 31, 63] },
  { id: 'A52', name: '森林绿', hex: '#228B22', rgb: [34, 139, 34] },
  { id: 'A53', name: '砖红', hex: '#B22222', rgb: [178, 34, 34] },
  { id: 'A54', name: '沙色', hex: '#F4A460', rgb: [244, 164, 96] },
  { id: 'A55', name: '卡其', hex: '#F0E68C', rgb: [240, 230, 140] },
  { id: 'A56', name: '栗色', hex: '#800000', rgb: [128, 0, 0] },
  { id: 'A57', name: '青绿', hex: '#20B2AA', rgb: [32, 178, 170] },
  { id: 'A58', name: '琥珀', hex: '#FFBF00', rgb: [255, 191, 0] },
  { id: 'A59', name: '翡翠', hex: '#50C878', rgb: [80, 200, 120] },
  { id: 'A60', name: '红宝石', hex: '#E0115F', rgb: [224, 17, 95] },
  { id: 'A61', name: '蓝宝石', hex: '#082567', rgb: [8, 37, 103] },
  { id: 'A62', name: '紫水晶', hex: '#9966CC', rgb: [153, 102, 204] },
  { id: 'A63', name: '孔雀蓝', hex: '#006994', rgb: [0, 105, 148] },
  { id: 'A64', name: '玫瑰金', hex: '#B76E79', rgb: [183, 110, 121] },
  // 新增肤色系列
  { id: 'S01', name: '极浅肤色', hex: '#FFE4C4', rgb: [255, 228, 196] },
  { id: 'S02', name: '浅肤色', hex: '#FFDAB9', rgb: [255, 218, 185] },
  { id: 'S03', name: '中肤色', hex: '#F4A460', rgb: [244, 164, 96] },
  { id: 'S04', name: '深肤色', hex: '#DEB887', rgb: [222, 184, 135] },
  { id: 'S05', name: '极深肤色', hex: '#CD853F', rgb: [205, 133, 63] },
  // 新增粉色系列
  { id: 'P01', name: '浅粉', hex: '#FFE4E1', rgb: [255, 228, 225] },
  { id: 'P02', name: '中粉', hex: '#FFC0CB', rgb: [255, 192, 203] },
  { id: 'P03', name: '深粉', hex: '#FF69B4', rgb: [255, 105, 180] },
  { id: 'P04', name: '玫瑰粉', hex: '#FF1493', rgb: [255, 20, 147] },
  // 新增棕色系列
  { id: 'Br01', name: '浅棕', hex: '#D2B48C', rgb: [210, 180, 140] },
  { id: 'Br02', name: '中棕', hex: '#A0522D', rgb: [160, 82, 45] },
  { id: 'Br03', name: '深棕', hex: '#8B4513', rgb: [139, 69, 19] },
  { id: 'Br04', name: '黑棕', hex: '#5C3317', rgb: [92, 51, 23] },
  // 新增灰色系列
  { id: 'Gr01', name: '极浅灰', hex: '#F5F5F5', rgb: [245, 245, 245] },
  { id: 'Gr02', name: '浅灰', hex: '#D3D3D3', rgb: [211, 211, 211] },
  { id: 'Gr03', name: '中灰', hex: '#A9A9A9', rgb: [169, 169, 169] },
  { id: 'Gr04', name: '深灰', hex: '#696969', rgb: [105, 105, 105] }
];

// 将RGB转换为XYZ颜色空间
function rgbToXyz(r, g, b) {
  r = r / 255;
  g = g / 255;
  b = b / 255;
  
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  
  r *= 100;
  g *= 100;
  b *= 100;
  
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  
  return [x, y, z];
}

// 将XYZ转换为LAB颜色空间
function xyzToLab(x, y, z) {
  const refX = 95.047;
  const refY = 100.000;
  const refZ = 108.883;
  
  x = x / refX;
  y = y / refY;
  z = z / refZ;
  
  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16/116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16/116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16/116);
  
  const l = (116 * y) - 16;
  const a = 500 * (x - y);
  const b = 200 * (y - z);
  
  return [l, a, b];
}

// CIEDE2000颜色差异计算
// 参考: https://en.wikipedia.org/wiki/CIEDE2000
export function ciede2000(lab1, lab2) {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  
  // 计算C1, C2, Cab_avg
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cab_avg = (C1 + C2) / 2;
  
  // 计算G
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cab_avg, 7) / (Math.pow(Cab_avg, 7) + Math.pow(25, 7))));
  
  // 计算a1', a2'
  const a1_prime = a1 * (1 + G);
  const a2_prime = a2 * (1 + G);
  
  // 计算C1', C2', C'_avg
  const C1_prime = Math.sqrt(a1_prime * a1_prime + b1 * b1);
  const C2_prime = Math.sqrt(a2_prime * a2_prime + b2 * b2);
  const C_prime_avg = (C1_prime + C2_prime) / 2;
  
  // 计算h1', h2', h'_avg
  let h1_prime = Math.atan2(b1, a1_prime);
  if (h1_prime < 0) h1_prime += 2 * Math.PI;
  
  let h2_prime = Math.atan2(b2, a2_prime);
  if (h2_prime < 0) h2_prime += 2 * Math.PI;
  
  let h_prime_avg;
  if (Math.abs(h1_prime - h2_prime) > Math.PI) {
    h_prime_avg = (h1_prime + h2_prime + 2 * Math.PI) / 2;
  } else {
    h_prime_avg = (h1_prime + h2_prime) / 2;
  }
  
  // 计算ΔL', ΔC', ΔH'
  const delta_L_prime = L2 - L1;
  const delta_C_prime = C2_prime - C1_prime;
  
  let delta_h_prime;
  if (C1_prime * C2_prime === 0) {
    delta_h_prime = 0;
  } else if (Math.abs(h2_prime - h1_prime) <= Math.PI) {
    delta_h_prime = h2_prime - h1_prime;
  } else if (h2_prime > h1_prime) {
    delta_h_prime = h2_prime - h1_prime - 2 * Math.PI;
  } else {
    delta_h_prime = h2_prime - h1_prime + 2 * Math.PI;
  }
  
  const delta_H_prime = 2 * Math.sqrt(C1_prime * C2_prime) * Math.sin(delta_h_prime / 2);
  
  // 计算L'_avg, C'_avg
  const L_prime_avg = (L1 + L2) / 2;
  
  // 计算T
  const T = 1 - 0.17 * Math.cos(h_prime_avg - Math.PI/6) + 
           0.24 * Math.cos(2 * h_prime_avg) + 
           0.32 * Math.cos(3 * h_prime_avg + Math.PI/30) - 
           0.2 * Math.cos(4 * h_prime_avg - 21 * Math.PI/60);
  
  // 计算SL, SC, SH
  const SL = 1 + (0.015 * Math.pow(L_prime_avg - 50, 2)) / Math.sqrt(20 + Math.pow(L_prime_avg - 50, 2));
  const SC = 1 + 0.045 * C_prime_avg;
  const SH = 1 + 0.015 * C_prime_avg * T;
  
  // 计算RT
  const delta_theta = 30 * Math.exp(-Math.pow((h_prime_avg - 275 * Math.PI/180) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(C_prime_avg, 7) / (Math.pow(C_prime_avg, 7) + Math.pow(25, 7)));
  const RT = -RC * Math.sin(2 * delta_theta);
  
  // 计算ΔE00
  const kL = 1;
  const kC = 1;
  const kH = 1;
  
  const delta_E00 = Math.sqrt(
    Math.pow(delta_L_prime / (kL * SL), 2) +
    Math.pow(delta_C_prime / (kC * SC), 2) +
    Math.pow(delta_H_prime / (kH * SH), 2) +
    RT * (delta_C_prime / (kC * SC)) * (delta_H_prime / (kH * SH))
  );
  
  return delta_E00;
}

// 计算两个颜色的距离 (使用CIEDE2000)
export function colorDistance(rgb1, rgb2) {
  const [x1, y1, z1] = rgbToXyz(rgb1[0], rgb1[1], rgb1[2]);
  const [x2, y2, z2] = rgbToXyz(rgb2[0], rgb2[1], rgb2[2]);
  
  const lab1 = xyzToLab(x1, y1, z1);
  const lab2 = xyzToLab(x2, y2, z2);
  
  return ciede2000(lab1, lab2);
}

// 找到最匹配的拼豆颜色
export function findClosestColor(rgb, colors = perlerColors) {
  let minDistance = Infinity;
  let closestColor = colors[0];
  
  for (const color of colors) {
    const distance = colorDistance(rgb, color.rgb);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }
  
  return closestColor;
}

// 根据RGB值动态生成拼豆颜色
export function generateDynamicColor(rgb) {
  const [r, g, b] = rgb;
  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  
  // 生成唯一ID
  const id = `D${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  
  return {
    id,
    name: `自定义色 ${hex}`,
    hex,
    rgb: [r, g, b]
  };
}

// 混合颜色匹配策略：优先使用预定义颜色，误差过大时使用动态颜色
export function smartColorMatch(rgb, colors = perlerColors, threshold = 10) {
  const closestColor = findClosestColor(rgb, colors);
  const distance = colorDistance(rgb, closestColor.rgb);
  
  if (distance < threshold) {
    return closestColor;
  } else {
    return generateDynamicColor(rgb);
  }
}

// 直接使用原图RGB值，确保颜色完全一致
export function directColorMatch(rgb) {
  const [r, g, b] = rgb;
  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  
  // 生成唯一ID
  const id = `D${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  
  return {
    id,
    name: `自定义色 ${hex}`,
    hex,
    rgb: [r, g, b]
  };
}