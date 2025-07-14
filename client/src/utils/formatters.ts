import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

export function formatDate(date: string | Date, formatString: string = 'MMM d, yyyy'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) ? format(dateObj, formatString) : 'Invalid date';
  } catch {
    return 'Invalid date';
  }
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'MMM d, yyyy h:mm a');
}

export function formatTimeAgo(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) ? formatDistanceToNow(dateObj, { addSuffix: true }) : 'Unknown time';
  } catch {
    return 'Unknown time';
  }
}

export function formatCurrency(amount: number | string, currency: string = 'USD'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(numAmount);
}

export function formatNumber(value: number | string, decimals: number = 0): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDuration(hours: number | string): string {
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  
  if (isNaN(numHours)) return '0h';
  
  const wholeHours = Math.floor(numHours);
  const minutes = Math.round((numHours - wholeHours) * 60);
  
  if (wholeHours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${wholeHours}h`;
  } else {
    return `${wholeHours}h ${minutes}m`;
  }
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatWorkOrderNumber(number: string): string {
  // Format work order numbers consistently (e.g., WO-001)
  if (number.startsWith('WO-')) return number;
  return `WO-${number.padStart(3, '0')}`;
}

export function formatAssetTag(tag: string): string {
  // Format asset tags consistently (uppercase)
  return tag.toUpperCase();
}

export function formatPhoneNumber(phone: string): string {
  // Basic US phone number formatting
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone; // Return original if it doesn't match expected patterns
}

export function formatStatus(status: string): string {
  // Format status strings for display (capitalize, replace underscores)
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatPriority(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function formatEquipmentSpecifications(specs: Record<string, any>): string {
  if (!specs || typeof specs !== 'object') return '';
  
  return Object.entries(specs)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}

export function formatCustomFields(fields: Record<string, any>): Array<{ label: string; value: string }> {
  if (!fields || typeof fields !== 'object') return [];
  
  return Object.entries(fields).map(([key, value]) => ({
    label: formatStatus(key),
    value: String(value),
  }));
}

export function formatSearchQuery(query: string): string {
  // Clean and format search queries
  return query.trim().toLowerCase();
}

export function formatValidationErrors(errors: Record<string, string[]>): string {
  // Format validation errors for display
  return Object.entries(errors)
    .map(([field, fieldErrors]) => 
      `${formatStatus(field)}: ${fieldErrors.join(', ')}`
    )
    .join('; ');
}

export function formatTableHeader(header: string): string {
  // Format table headers consistently
  return header
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization (remove script tags and dangerous attributes)
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/javascript:/gi, '');
}

export function parseNumericInput(input: string): number | null {
  const cleaned = input.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export function formatInventoryLevel(current: number, reorderPoint: number, maxStock?: number): {
  level: string;
  color: string;
  percentage: number;
} {
  const percentage = maxStock ? (current / maxStock) * 100 : 0;
  
  if (current <= 0) {
    return { level: 'Out of Stock', color: 'red', percentage: 0 };
  } else if (current <= reorderPoint) {
    return { level: 'Low Stock', color: 'yellow', percentage };
  } else {
    return { level: 'In Stock', color: 'green', percentage };
  }
}
