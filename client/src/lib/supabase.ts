// For this implementation, we're using the existing API structure
// In a real Supabase implementation, this would contain the Supabase client
export const supabase = null; // Placeholder for Supabase client

// Since we're using the existing backend structure, 
// we'll export utility functions that work with our API
export async function uploadFile(file: File, bucket: string, path: string): Promise<string> {
  // In a real implementation, this would upload to Supabase Storage
  // For now, we'll simulate file upload
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`/api/upload/${bucket}`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload file');
  }
  
  const result = await response.json();
  return result.url;
}

export async function compressImage(file: File, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      const maxWidth = 1920;
      const maxHeight = 1080;
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        if (width / maxWidth > height / maxHeight) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        } else {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
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
    };
    
    img.src = URL.createObjectURL(file);
  });
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

export function validateFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize;
}
