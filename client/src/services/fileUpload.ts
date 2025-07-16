import { AttachmentUpload, FileUploadOptions } from '../types';

export interface FileUploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  error?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export class FileUploadService {
  private static readonly DEFAULT_OPTIONS: FileUploadOptions = {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'audio/mpeg', 'video/mp4'],
    compress: true,
    quality: 0.8,
  };

  /**
   * Validate file before upload
   */
  static validateFile(file: File, options: Partial<FileUploadOptions> = {}): FileValidationResult {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    // Check file size
    if (file.size > config.maxSize) {
      return {
        isValid: false,
        error: `File size exceeds ${Math.round(config.maxSize / 1024 / 1024)}MB limit`,
      };
    }

    // Check file type
    if (!config.allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed. Supported types: ${config.allowedTypes.join(', ')}`,
      };
    }

    // Check file name
    if (file.name.length > 255) {
      return {
        isValid: false,
        error: 'File name is too long (max 255 characters)',
      };
    }

    // Check for potentially dangerous file names
    const dangerousPatterns = [
      /\.\./,
      /[<>:"|?*]/,
      /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i,
    ];

    if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
      return {
        isValid: false,
        error: 'File name contains invalid characters',
      };
    }

    return { isValid: true };
  }

  /**
   * Compress image file
   */
  static async compressImage(file: File, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate dimensions (max 1920x1080)
          const maxWidth = 1920;
          const maxHeight = 1080;
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx!.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            file.type,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate thumbnail from image
   */
  static async generateThumbnail(file: File, size: number = 200): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File is not an image'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          const { width, height } = img;
          const ratio = Math.min(size / width, size / height);
          const newWidth = width * ratio;
          const newHeight = height * ratio;

          canvas.width = newWidth;
          canvas.height = newHeight;

          ctx!.drawImage(img, 0, 0, newWidth, newHeight);
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(thumbnailDataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Upload file to server
   */
  static async uploadFile(
    file: File,
    context: {
      workOrderId?: string;
      equipmentId?: string;
      pmTemplateId?: string;
      vendorId?: string;
    },
    options: Partial<FileUploadOptions> = {},
    onProgress?: (progress: number) => void
  ): Promise<FileUploadResult> {
    try {
      const config = { ...this.DEFAULT_OPTIONS, ...options };
      
      // Validate file
      const validation = this.validateFile(file, config);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Compress image if enabled
      let processedFile = file;
      if (config.compress && file.type.startsWith('image/')) {
        processedFile = await this.compressImage(file, config.quality);
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('context', JSON.stringify(context));

      // Upload with progress tracking
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'x-user-id': localStorage.getItem('userId') || '',
          'x-warehouse-id': localStorage.getItem('warehouseId') || '',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Upload failed',
        };
      }

      const result = await response.json();
      return {
        success: true,
        fileUrl: result.fileUrl,
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileType: result.fileType,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Delete file from server
   */
  static async deleteFile(fileId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/attachments/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || '',
          'x-warehouse-id': localStorage.getItem('warehouseId') || '',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  /**
   * Get file preview URL
   */
  static getPreviewUrl(fileUrl: string, fileType: string): string {
    if (fileType.startsWith('image/')) {
      return fileUrl;
    }
    
    // For other file types, return a placeholder or icon
    if (fileType === 'application/pdf') {
      return '/icons/pdf-icon.png';
    }
    
    if (fileType.startsWith('audio/')) {
      return '/icons/audio-icon.png';
    }
    
    if (fileType.startsWith('video/')) {
      return '/icons/video-icon.png';
    }
    
    return '/icons/file-icon.png';
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if file type is supported for preview
   */
  static canPreview(fileType: string): boolean {
    const previewableTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
    ];
    
    return previewableTypes.includes(fileType);
  }

  /**
   * Generate a preview URL for a file
   */
  static async generatePreview(fileUrl: string): Promise<{
    success: boolean;
    previewUrl?: string;
    error?: string;
  }> {
    try {
      // For now, return the original URL as preview
      // In a real implementation, this would generate thumbnails, etc.
      return {
        success: true,
        previewUrl: fileUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate preview',
      };
    }
  }
}

export default FileUploadService;
