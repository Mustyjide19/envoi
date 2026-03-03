const { getFileExtension, formatFileSize, getFileTypeIcon } = require('../utils/fileUtils');

describe('File Extension Extractor', () => {
  test('extracts extension from filename', () => {
    expect(getFileExtension('document.pdf')).toBe('pdf');
    expect(getFileExtension('code.py')).toBe('py');
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
  });
});

describe('File Size Formatter', () => {
  test('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
  });

  test('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.00 KB');
    expect(formatFileSize(10240)).toBe('10.00 KB');
  });

  test('formats megabytes', () => {
    expect(formatFileSize(5242880)).toBe('5.00 MB');
    expect(formatFileSize(31457280)).toBe('30.00 MB');
  });
});

describe('File Type Icon', () => {
  test('returns correct icons', () => {
    expect(getFileTypeIcon('document.pdf')).toBe('📄');
    expect(getFileTypeIcon('code.py')).toBe('🐍');
    expect(getFileTypeIcon('presentation.pptx')).toBe('📊');
  });

  test('returns default icon for unknown types', () => {
    expect(getFileTypeIcon('unknown.xyz')).toBe('📁');
  });
});