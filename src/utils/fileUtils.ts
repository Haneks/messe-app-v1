import mammoth from 'mammoth';

/**
 * Utility functions for file handling and validation
 */

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates if a file is a supported text file
 */
export const validateTextFile = (file: File): FileValidationResult => {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Le fichier est trop volumineux. Taille maximale : 5MB'
    };
  }

  // Check file type
  const validTypes = [
    'text/plain', 
    'text/txt', 
    'application/txt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const validExtensions = ['.txt', '.text', '.docx'];
  
  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  if (!hasValidType && !hasValidExtension) {
    return {
      isValid: false,
      error: 'Format de fichier non supporté. Utilisez un fichier .txt ou .docx'
    };
  }

  return { isValid: true };
};

/**
 * Reads a text file with proper encoding handling
 */
export const readTextFile = (file: File): Promise<string> => {
  // Handle Word documents
  if (file.name.toLowerCase().endsWith('.docx')) {
    return readWordFile(file);
  }
  
  // Handle text files
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Impossible de lire le fichier comme texte'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };
    
    // Try UTF-8 first, fallback to system default
    try {
      reader.readAsText(file, 'UTF-8');
    } catch (error) {
      reader.readAsText(file);
    }
  });
};

/**
 * Reads a Word document and extracts text content
 */
export const readWordFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          reject(new Error('Impossible de lire le fichier Word'));
          return;
        }
        
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (error) {
        reject(new Error('Erreur lors de l\'extraction du texte du fichier Word'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier Word'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};
/**
 * Sanitizes and validates text content for song lyrics
 */
export const sanitizeLyricsContent = (content: string): { 
  isValid: boolean; 
  sanitizedContent: string; 
  error?: string 
} => {
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      sanitizedContent: '',
      error: 'Contenu invalide'
    };
  }

  // Normalize line endings and trim
  let sanitized = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // Check minimum length
  if (sanitized.length < 10) {
    return {
      isValid: false,
      sanitizedContent: '',
      error: 'Le contenu est trop court'
    };
  }

  // Check for reasonable structure
  const lines = sanitized.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  
  if (nonEmptyLines.length < 2) {
    return {
      isValid: false,
      sanitizedContent: '',
      error: 'Le fichier doit contenir au moins 2 lignes'
    };
  }

  // Remove excessive blank lines (more than 2 consecutive)
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  return {
    isValid: true,
    sanitizedContent: sanitized
  };
};

/**
 * Extracts a song title from filename or content
 */
export const extractSongTitle = (filename: string, content: string): string => {
  // Clean filename
  const titleFromFilename = filename
    .replace(/\.(txt|text)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Try to extract from first line
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length > 0) {
    const firstLine = lines[0];
    
    // If first line looks like a title (short, no verse markers)
    if (firstLine.length < 100 && 
        !firstLine.match(/^(R\/|Refrain|Couplet|\d+\.|\(|\[)/i) &&
        firstLine.length > 3) {
      return firstLine;
    }
  }

  return titleFromFilename || 'Chant importé';
};

/**
 * Detects the likely category of a song based on its title and content
 */
export const detectSongCategory = (title: string, content: string): string => {
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();
  
  // Keywords for different categories
  const categoryKeywords = {
    entrance: ['entrée', 'accueil', 'rassemblement', 'venez', 'entrons'],
    kyrie: ['kyrie', 'pitié', 'seigneur prends pitié'],
    gloria: ['gloria', 'gloire à dieu', 'gloire au plus haut'],
    offertory: ['offertoire', 'présentation', 'pain', 'vin', 'offrande'],
    sanctus: ['sanctus', 'saint', 'hosanna'],
    communion: ['communion', 'pain de vie', 'corps du christ', 'goûtez'],
    final: ['envoi', 'sortie', 'allez', 'mission', 'marie']
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => 
      titleLower.includes(keyword) || contentLower.includes(keyword)
    )) {
      return category;
    }
  }

  return 'other';
};