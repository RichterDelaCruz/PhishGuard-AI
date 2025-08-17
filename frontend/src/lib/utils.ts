export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatRiskScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function getRiskColor(score: number): string {
  if (score < 0.3) return 'text-green-600';
  if (score < 0.7) return 'text-yellow-600';
  return 'text-red-600';
}

export function getClassificationColor(classification: string): string {
  switch (classification) {
    case 'safe':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'suspicious':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'phishing':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export async function extractTextFromEmlFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        // For MVP, we'll return the raw .eml content
        // In a more sophisticated implementation, we could parse email headers/body
        resolve(content);
      } catch {
        reject(new Error('Failed to read file content'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
