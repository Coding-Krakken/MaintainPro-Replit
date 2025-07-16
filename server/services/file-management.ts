import { storage } from '../storage';
import { InsertAttachment, Attachment } from '@shared/schema';
import { createReadStream, createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { createHash } from 'crypto';
import sharp from 'sharp';

export interface FileUploadResult {
  fileId: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  checksum: string;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface FileContext {
  workOrderId?: string;
  equipmentId?: string;
  pmTemplateId?: string;
  vendorId?: string;
  uploadedBy: string;
  type: 'work_order' | 'equipment' | 'pm_template' | 'vendor_document';
  category: 'photo' | 'document' | 'audio' | 'video' | 'other';
}

export interface FileCompressionOptions {
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

class FileManagementService {
  private static instance: FileManagementService;
  private uploadPath = process.env.UPLOAD_PATH || './uploads';
  private thumbnailPath = process.env.THUMBNAIL_PATH || './uploads/thumbnails';
  private maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB
  private allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
    'video/webm'
  ];

  private constructor() {
    this.initializeDirectories();
  }

  public static getInstance(): FileManagementService {
    if (!FileManagementService.instance) {
      FileManagementService.instance = new FileManagementService();
    }
    return FileManagementService.instance;
  }

  /**
   * Upload file with validation, compression, and thumbnail generation
   */
  async uploadFile(file: Buffer, fileName: string, context: FileContext, options?: FileCompressionOptions): Promise<FileUploadResult> {
    const validation = await this.validateFile(file, fileName);
    if (!validation.isValid) {
      throw new Error(validation.error || 'File validation failed');
    }

    const fileId = crypto.randomUUID();
    const fileExtension = extname(fileName);
    const mimeType = this.getMimeType(fileName);
    const checksum = this.calculateChecksum(file);
    
    // Generate unique filename
    const uniqueFileName = `${fileId}${fileExtension}`;
    const filePath = join(this.uploadPath, uniqueFileName);
    
    let processedFile = file;
    let thumbnailUrl: string | undefined;

    // Compress images if options provided
    if (options && this.isImage(mimeType)) {
      processedFile = await this.compressImage(file, options);
    }

    // Generate thumbnail for images and videos
    if (this.isImage(mimeType)) {
      thumbnailUrl = await this.generateImageThumbnail(processedFile, fileId);
    } else if (this.isVideo(mimeType)) {
      thumbnailUrl = await this.generateVideoThumbnail(file, fileId);
    }

    // Save file to disk
    await fs.writeFile(filePath, processedFile);

    // Create attachment record
    const attachment: InsertAttachment = {
      id: fileId,
      fileName: fileName,
      originalName: fileName,
      fileUrl: `/uploads/${uniqueFileName}`,
      thumbnailUrl,
      fileSize: processedFile.length,
      mimeType,
      checksum,
      workOrderId: context.workOrderId,
      equipmentId: context.equipmentId,
      pmTemplateId: context.pmTemplateId,
      vendorId: context.vendorId,
      uploadedBy: context.uploadedBy,
      uploadContext: context.type,
      category: context.category,
      createdAt: new Date(),
      metadata: {
        originalSize: file.length,
        compressed: processedFile.length !== file.length,
        thumbnailGenerated: !!thumbnailUrl
      }
    };

    const savedAttachment = await storage.createAttachment(attachment);

    return {
      fileId: savedAttachment.id,
      fileName: savedAttachment.fileName,
      fileUrl: savedAttachment.fileUrl,
      thumbnailUrl: savedAttachment.thumbnailUrl,
      fileSize: savedAttachment.fileSize,
      mimeType: savedAttachment.mimeType,
      uploadedAt: savedAttachment.createdAt,
      checksum: savedAttachment.checksum
    };
  }

  /**
   * Validate file size, type, and security
   */
  async validateFile(file: Buffer, fileName: string): Promise<FileValidationResult> {
    const mimeType = this.getMimeType(fileName);
    const fileSize = file.length;
    const warnings: string[] = [];

    // Check file size
    if (fileSize > this.maxFileSize) {
      return {
        isValid: false,
        error: `File size (${this.formatFileSize(fileSize)}) exceeds maximum allowed size (${this.formatFileSize(this.maxFileSize)})`
      };
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(mimeType)) {
      return {
        isValid: false,
        error: `File type ${mimeType} is not allowed`
      };
    }

    // Check for potentially malicious content
    const securityCheck = await this.scanFileForSecurity(file, fileName);
    if (!securityCheck.isValid) {
      return securityCheck;
    }

    // Check file header matches extension
    const headerCheck = await this.validateFileHeader(file, mimeType);
    if (!headerCheck.isValid) {
      warnings.push('File header does not match extension');
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Generate thumbnail for image files
   */
  async generateImageThumbnail(imageBuffer: Buffer, fileId: string): Promise<string> {
    const thumbnailFileName = `${fileId}_thumb.webp`;
    const thumbnailPath = join(this.thumbnailPath, thumbnailFileName);

    await sharp(imageBuffer)
      .resize(200, 200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toFile(thumbnailPath);

    return `/uploads/thumbnails/${thumbnailFileName}`;
  }

  /**
   * Generate thumbnail for video files
   */
  async generateVideoThumbnail(videoBuffer: Buffer, fileId: string): Promise<string> {
    // TODO: Implement video thumbnail generation using ffmpeg
    // For now, return a placeholder
    return '/assets/video-placeholder.png';
  }

  /**
   * Compress image file
   */
  async compressImage(imageBuffer: Buffer, options: FileCompressionOptions): Promise<Buffer> {
    let sharpInstance = sharp(imageBuffer);

    // Resize if dimensions specified
    if (options.maxWidth || options.maxHeight) {
      sharpInstance = sharpInstance.resize(options.maxWidth, options.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert to specified format with quality
    switch (options.format) {
      case 'jpeg':
        return await sharpInstance.jpeg({ quality: options.quality }).toBuffer();
      case 'png':
        return await sharpInstance.png({ quality: options.quality }).toBuffer();
      case 'webp':
        return await sharpInstance.webp({ quality: options.quality }).toBuffer();
      default:
        return await sharpInstance.jpeg({ quality: options.quality }).toBuffer();
    }
  }

  /**
   * Get file attachment by ID
   */
  async getAttachment(attachmentId: string): Promise<Attachment | null> {
    return await storage.getAttachment(attachmentId);
  }

  /**
   * Get all attachments for a context
   */
  async getAttachmentsForContext(context: Partial<FileContext>): Promise<Attachment[]> {
    const attachments = await storage.getAttachments();
    return attachments.filter(attachment => {
      if (context.workOrderId && attachment.workOrderId !== context.workOrderId) return false;
      if (context.equipmentId && attachment.equipmentId !== context.equipmentId) return false;
      if (context.pmTemplateId && attachment.pmTemplateId !== context.pmTemplateId) return false;
      if (context.vendorId && attachment.vendorId !== context.vendorId) return false;
      return true;
    });
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const attachment = await storage.getAttachment(attachmentId);
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Check permissions (only uploader or admin can delete)
    if (attachment.uploadedBy !== userId) {
      // TODO: Check if user has admin permissions
      throw new Error('Insufficient permissions to delete this attachment');
    }

    // Delete files from disk
    try {
      const filePath = join(this.uploadPath, attachment.fileName);
      await fs.unlink(filePath);

      if (attachment.thumbnailUrl) {
        const thumbnailPath = join(this.thumbnailPath, attachment.thumbnailUrl.split('/').pop()!);
        await fs.unlink(thumbnailPath);
      }
    } catch (error) {
      console.error('Error deleting file from disk:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await storage.deleteAttachment(attachmentId);
  }

  /**
   * Get file stream for download
   */
  async getFileStream(attachmentId: string): Promise<NodeJS.ReadableStream> {
    const attachment = await storage.getAttachment(attachmentId);
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    const filePath = join(this.uploadPath, attachment.fileName);
    return createReadStream(filePath);
  }

  /**
   * Generate file preview (for supported formats)
   */
  async generatePreview(attachmentId: string): Promise<string | null> {
    const attachment = await storage.getAttachment(attachmentId);
    if (!attachment) {
      return null;
    }

    // Return thumbnail for images
    if (this.isImage(attachment.mimeType) && attachment.thumbnailUrl) {
      return attachment.thumbnailUrl;
    }

    // For PDFs, generate preview image
    if (attachment.mimeType === 'application/pdf') {
      return await this.generatePDFPreview(attachmentId);
    }

    return null;
  }

  /**
   * Bulk upload files
   */
  async bulkUpload(files: { buffer: Buffer; fileName: string; context: FileContext }[]): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file.buffer, file.fileName, file.context);
        results.push(result);
      } catch (error) {
        errors.push(`${file.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      console.warn('Bulk upload errors:', errors);
    }

    return results;
  }

  /**
   * Get file usage statistics
   */
  async getFileStatistics(warehouseId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const attachments = await storage.getAttachments();
    const warehouseAttachments = attachments.filter(a => {
      // Filter by warehouse through related entities
      // This is a simplified check - in production, you'd query through joins
      return true; // TODO: Implement proper warehouse filtering
    });

    const stats = {
      totalFiles: warehouseAttachments.length,
      totalSize: warehouseAttachments.reduce((sum, a) => sum + a.fileSize, 0),
      byCategory: {} as Record<string, number>,
      byType: {} as Record<string, number>
    };

    warehouseAttachments.forEach(attachment => {
      const category = attachment.category || 'other';
      const type = attachment.mimeType;

      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  }

  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
      await fs.mkdir(this.thumbnailPath, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directories:', error);
    }
  }

  private getMimeType(fileName: string): string {
    const ext = extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  private calculateChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  private async scanFileForSecurity(buffer: Buffer, fileName: string): Promise<FileValidationResult> {
    // Basic security checks
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1000));
    
    // Check for script tags in files that shouldn't have them
    if (content.includes('<script>') || content.includes('javascript:')) {
      return {
        isValid: false,
        error: 'File contains potentially malicious content'
      };
    }

    // Check for executable file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif', '.vbs', '.js'];
    const ext = extname(fileName).toLowerCase();
    if (dangerousExtensions.includes(ext)) {
      return {
        isValid: false,
        error: 'Executable files are not allowed'
      };
    }

    return { isValid: true };
  }

  private async validateFileHeader(buffer: Buffer, mimeType: string): Promise<FileValidationResult> {
    const header = buffer.subarray(0, 4);
    
    // Check common file signatures
    const signatures: Record<string, Buffer[]> = {
      'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
      'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
      'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
      'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])]
    };

    const expectedSignatures = signatures[mimeType];
    if (expectedSignatures) {
      const matches = expectedSignatures.some(sig => 
        header.subarray(0, sig.length).equals(sig)
      );
      
      if (!matches) {
        return {
          isValid: false,
          error: 'File header does not match expected format'
        };
      }
    }

    return { isValid: true };
  }

  private async generatePDFPreview(attachmentId: string): Promise<string> {
    // TODO: Implement PDF preview generation using pdf-poppler or similar
    return '/assets/pdf-preview.png';
  }
}

export const fileManagementService = FileManagementService.getInstance();
