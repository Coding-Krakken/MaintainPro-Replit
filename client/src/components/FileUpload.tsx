import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, FileText, Music, Video, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUploadService } from '@/services/fileUpload';
import { AttachmentUpload } from '@/types';

interface FileUploadProps {
  workOrderId?: string;
  equipmentId?: string;
  pmTemplateId?: string;
  vendorId?: string;
  onUploadSuccess?: (fileUrl: string, fileName: string) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  workOrderId,
  equipmentId,
  pmTemplateId,
  vendorId,
  onUploadSuccess,
  onUploadError,
  maxFiles = 5,
  disabled = false,
  className = '',
}) => {
  const [uploads, setUploads] = useState<AttachmentUpload[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (fileType === 'application/pdf') return <FileText className="w-5 h-5" />;
    if (fileType.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const handleFiles = useCallback(async (files: FileList) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    
    // Check file limit
    if (uploads.length + fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setError(null);

    for (const file of fileArray) {
      const uploadId = `${Date.now()}-${Math.random()}`;
      const newUpload: AttachmentUpload = {
        file,
        progress: 0,
      };

      setUploads(prev => [...prev, newUpload]);

      try {
        const result = await FileUploadService.uploadFile(
          file,
          { workOrderId, equipmentId, pmTemplateId, vendorId },
          {},
          (progress) => {
            setUploads(prev => prev.map(upload => 
              upload.file === file ? { ...upload, progress } : upload
            ));
          }
        );

        if (result.success) {
          setUploads(prev => prev.map(upload => 
            upload.file === file 
              ? { ...upload, progress: 100, url: result.fileUrl }
              : upload
          ));
          
          if (onUploadSuccess && result.fileUrl && result.fileName) {
            onUploadSuccess(result.fileUrl, result.fileName);
          }
        } else {
          setUploads(prev => prev.map(upload => 
            upload.file === file 
              ? { ...upload, error: result.error }
              : upload
          ));
          
          if (onUploadError && result.error) {
            onUploadError(result.error);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        setUploads(prev => prev.map(upload => 
          upload.file === file 
            ? { ...upload, error: errorMessage }
            : upload
        ));
        
        if (onUploadError) {
          onUploadError(errorMessage);
        }
      }
    }
  }, [uploads, maxFiles, disabled, workOrderId, equipmentId, pmTemplateId, vendorId, onUploadSuccess, onUploadError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const removeUpload = useCallback((file: File) => {
    setUploads(prev => prev.filter(upload => upload.file !== file));
  }, []);

  const openFileDialog = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <Upload className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop files here or click to upload
              </p>
              <p className="text-sm text-gray-500">
                Supports images, PDFs, audio, and video files (max 5MB each)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Maximum {maxFiles} files
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
            >
              Choose Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,audio/*,video/*"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">
            Uploading {uploads.length} file{uploads.length > 1 ? 's' : ''}
          </h4>
          {uploads.map((upload, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center space-x-3">
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(upload.file.type)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {upload.file.name}
                    </p>
                    <div className="flex items-center space-x-2">
                      {upload.error ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : upload.progress === 100 ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : null}
                      <button
                        onClick={() => removeUpload(upload.file)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    {FileUploadService.formatFileSize(upload.file.size)}
                  </p>

                  {/* Progress Bar */}
                  {!upload.error && upload.progress < 100 && (
                    <div className="mt-2">
                      <Progress value={upload.progress} className="h-1" />
                    </div>
                  )}

                  {/* Error Message */}
                  {upload.error && (
                    <p className="text-xs text-red-500 mt-1">
                      {upload.error}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
