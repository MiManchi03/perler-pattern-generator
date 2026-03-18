import { useRef } from 'react';

function ImageUploader({ onUpload, image }) {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div
      className={`upload-area ${image ? 'has-image' : ''}`}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      {image ? (
        <img src={image.src} alt="预览" className="preview-image" />
      ) : (
        <>
          <div className="upload-icon">📁</div>
          <div className="upload-text">
            <strong>点击上传</strong> 或拖拽图片到此处
          </div>
          <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '10px' }}>
            支持 JPG、PNG、GIF 等格式
          </div>
        </>
      )}
    </div>
  );
}

export default ImageUploader;