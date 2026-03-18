import { useState } from 'react';

function ColorLegend({ colors }) {
  const [showAll, setShowAll] = useState(false);
  // 默认只显示使用频率最高的前30种颜色，避免渲染过多颜色项导致性能问题
  const maxColorsToShow = 30;
  const colorArray = Array.from(colors.entries())
    .sort((a, b) => b[1].count - a[1].count);
  
  const displayColors = showAll ? colorArray : colorArray.slice(0, maxColorsToShow);

  return (
    <div className="color-legend">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>拼豆色卡汇总</h3>
        {colors.size > maxColorsToShow && (
          <button 
            onClick={() => setShowAll(!showAll)}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = '#764ba2'}
            onMouseLeave={(e) => e.target.style.background = '#667eea'}
          >
            {showAll ? '收起部分色卡' : `展示全部${colors.size}种色卡`}
          </button>
        )}
      </div>
      <div className="color-grid">
        {displayColors.map(([id, { color, count }]) => (
          <div key={id} className="color-item">
            <div 
              className="color-swatch" 
              style={{ backgroundColor: color.hex }}
            />
            <div className="color-info">
              <div className="color-code">{color.id}</div>
              <div className="color-count">{count} 颗</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ColorLegend;