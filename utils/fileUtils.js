function getFileExtension(filename) {
  return filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getFileTypeIcon(filename) {
  const ext = getFileExtension(filename);
  
  const iconMap = {
    pdf: '📄',
    docx: '📝',
    pptx: '📊',
    xlsx: '📈',
    jpg: '🖼️',
    png: '🖼️',
    py: '🐍',
    java: '☕',
    js: '📜',
    zip: '📦',
  };
  
  return iconMap[ext] || '📁';
}

module.exports = { getFileExtension, formatFileSize, getFileTypeIcon };