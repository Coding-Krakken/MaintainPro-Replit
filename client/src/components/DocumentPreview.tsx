import React, { useState } from 'react';
import { Eye, Download, Trash2, ExternalLink, FileText, Image, Music, Video, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUploadService } from '@/services/fileUpload';
import { Attachment } from '@/types';

interface DocumentPreviewProps {
  attachments: Attachment[];
  onDelete?: (attachmentId: string) => void;
  onDownload?: (attachment: Attachment) => void;
  showActions?: boolean;
  className?: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  attachments,
  onDelete,
  onDownload,
  showActions = true,
  className = '',
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (fileType === 'application/pdf') return <FileText className="w-5 h-5" />;
    if (fileType.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const getFileTypeColor = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'bg-green-100 text-green-800';
    if (fileType === 'application/pdf') return 'bg-red-100 text-red-800';
    if (fileType.startsWith('audio/')) return 'bg-purple-100 text-purple-800';
    if (fileType.startsWith('video/')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const handlePreview = async (attachment: Attachment) => {
    if (!attachment.fileUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await FileUploadService.generatePreview(attachment.fileUrl);
      
      if (result.success && result.previewUrl) {
        setPreviewUrl(result.previewUrl);
        setPreviewType(attachment.fileType || '');
      } else {
        setError(result.error || 'Failed to generate preview');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    if (onDownload) {
      onDownload(attachment);
    } else if (attachment.fileUrl) {
      // Default download behavior
      const link = document.createElement('a');
      link.href = attachment.fileUrl;
      link.download = attachment.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (onDelete) {
      onDelete(attachmentId);
    }
  };

  const renderPreview = () => {
    if (!previewUrl) return null;

    if (previewType.startsWith('image/')) {
      return (
        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full h-auto max-h-96 mx-auto rounded"
          />
        </div>
      );
    }

    if (previewType === 'application/pdf') {
      return (
        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
          <iframe
            src={previewUrl}
            className="w-full h-96"
            title="PDF Preview"
          />
        </div>
      );
    }

    if (previewType.startsWith('audio/')) {
      return (
        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
          <audio controls className="w-full">
            <source src={previewUrl} type={previewType} />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

    if (previewType.startsWith('video/')) {
      return (
        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
          <video controls className="w-full max-h-96">
            <source src={previewUrl} type={previewType} />
            Your browser does not support the video element.
          </video>
        </div>
      );
    }

    return (
      <div className="mt-4 p-4 border rounded-lg bg-gray-50 text-center">
        <p className="text-gray-600">Preview not available for this file type</p>
      </div>
    );
  };

  if (attachments.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <File className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">No attachments</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid gap-4">
        {attachments.map((attachment) => (
          <Card key={attachment.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getFileIcon(attachment.fileType || '')}
                  <div className="flex-1">
                    <CardTitle className="text-sm font-medium">
                      {attachment.fileName}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge
                        variant="secondary"
                        className={getFileTypeColor(attachment.fileType || '')}
                      >
                        {attachment.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {FileUploadService.formatFileSize(attachment.fileSize || 0)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {showActions && (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(attachment)}
                      disabled={isLoading}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {attachment.fileUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(attachment.fileUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(attachment.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  Uploaded by {attachment.uploadedBy || 'Unknown'}
                </span>
                <span>
                  {new Date(attachment.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              {renderPreview()}
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default DocumentPreview;
