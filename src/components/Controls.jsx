function Controls({ 
  settings, 
  onSettingsChange, 
  onDownload, 
  canDownload,
  isEditMode,
  onToggleEditMode,
  onUndo,
  canUndo,
  onReset,
  canReset,
  onSave,
  canSave
}) {
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

      {/* 自定义颜色功能 */}
      <div className="control-group edit-mode-group">
        <button 
          className={`btn ${isEditMode ? 'btn-active' : ''}`}
          onClick={onToggleEditMode}
        >
          🎨 {isEditMode ? '退出编辑' : '自定义格子'}
        </button>
        
        <div className="edit-mode-actions">
          <button 
            className="btn btn-small"
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销"
          >
            ↩️ 撤销
          </button>
          <button 
            className="btn btn-small"
            onClick={onReset}
            disabled={!canReset}
            title="重置"
          >
            🔄 重置
          </button>
        </div>
        
        <div className="edit-mode-actions">
          <button 
            className="btn btn-small"
            onClick={onSave}
            disabled={!canSave}
            title="保存修改"
          >
            💾 保存
          </button>
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