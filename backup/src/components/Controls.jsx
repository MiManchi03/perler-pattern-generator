function Controls({ settings, onSettingsChange, onDownload, canDownload }) {
  const handleChange = (key, value) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="controls">
      <div className="control-group">
        <label>拼豆尺寸 (格)</label>
        <select
          value={settings.size}
          onChange={(e) => handleChange('size', Number(e.target.value))}
        >
          <option value={30}>30 x 30 (小型)</option>
          <option value={50}>50 x 50 (中型)</option>
          <option value={80}>80 x 80 (大型)</option>
          <option value={100}>100 x 100 (超大型)</option>
          <option value={150}>150 x 150 (精细)</option>
        </select>
      </div>

      <div className="control-group">
        <label>颜色数量</label>
        <select
          value={settings.colorCount}
          onChange={(e) => handleChange('colorCount', Number(e.target.value))}
        >
          <option value={8}>8 色 (简约)</option>
          <option value={16}>16 色 (标准)</option>
          <option value={32}>32 色 (丰富)</option>
          <option value={64}>64 色 (完整)</option>
          <option value={100}>100 色 (超丰富)</option>
          <option value={256}>256 色 (接近原图)</option>
        </select>
      </div>

      <div className="control-group">
        <label>显示选项</label>
        <div className="checkbox-group">
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={settings.showColorCode}
              onChange={(e) => handleChange('showColorCode', e.target.checked)}
            />
            显示色号
          </label>
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={settings.showRowCol}
              onChange={(e) => handleChange('showRowCol', e.target.checked)}
            />
            显示行列号
          </label>
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={settings.showGrid}
              onChange={(e) => handleChange('showGrid', e.target.checked)}
            />
            显示网格线
          </label>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={onDownload}
        disabled={!canDownload}
      >
        📥 下载高清图纸
      </button>
    </div>
  );
}

export default Controls;