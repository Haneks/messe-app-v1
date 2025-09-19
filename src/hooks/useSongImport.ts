import { useState, useCallback } from 'react';
import { Song } from '../types/liturgy';
import { 
  validateTextFile, 
  readTextFile, 
  sanitizeLyricsContent, 
  extractSongTitle,
  detectSongCategory 
} from '../utils/fileUtils';

export interface ImportProgress {
  stage: 'idle' | 'validating' | 'reading' | 'processing' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
}

export interface ImportResult {
  success: boolean;
  song?: Omit<Song, 'id'>;
  error?: string;
}

export interface ImportOptions {
  category?: Song['category'];
  author?: string;
  melody?: string;
  autoDetectCategory?: boolean;
}

/**
 * Custom hook for handling song import functionality
 */
export const useSongImport = () => {
  const [progress, setProgress] = useState<ImportProgress>({
    stage: 'idle',
    message: '',
    progress: 0
  });

  const updateProgress = useCallback((stage: ImportProgress['stage'], message: string, progress: number) => {
    setProgress({ stage, message, progress });
  }, []);

  const importSongFromFile = useCallback(async (
    file: File, 
    options: ImportOptions = {}
  ): Promise<ImportResult> => {
    try {
      // Stage 1: Validation
      updateProgress('validating', 'Validation du fichier...', 10);
      
      const validation = validateTextFile(file);
      if (!validation.isValid) {
        updateProgress('error', validation.error || 'Fichier invalide', 0);
        return { success: false, error: validation.error };
      }

      // Stage 2: Reading file
      updateProgress('reading', 'Lecture du fichier...', 30);
      
      const content = await readTextFile(file);
      
      // Stage 3: Processing content
      updateProgress('processing', 'Traitement du contenu...', 60);
      
      const { isValid, sanitizedContent, error } = sanitizeLyricsContent(content);
      if (!isValid) {
        updateProgress('error', error || 'Contenu invalide', 0);
        return { success: false, error };
      }

      // Stage 4: Creating song object
      updateProgress('processing', 'Création du chant...', 80);
      
      const title = extractSongTitle(file.name, sanitizedContent);
      const detectedCategory = options.autoDetectCategory 
        ? detectSongCategory(title, sanitizedContent)
        : 'other';

      const song: Omit<Song, 'id'> = {
        title,
        lyrics: sanitizedContent,
        author: options.author || undefined,
        melody: options.melody || undefined,
        category: options.category || detectedCategory as Song['category'],
        order: 0
      };

      // Stage 5: Complete
      updateProgress('complete', `Chant "${title}" importé avec succès`, 100);
      
      return { success: true, song };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      updateProgress('error', errorMessage, 0);
      return { success: false, error: errorMessage };
    }
  }, [updateProgress]);

  const resetProgress = useCallback(() => {
    setProgress({
      stage: 'idle',
      message: '',
      progress: 0
    });
  }, []);

  return {
    progress,
    importSongFromFile,
    resetProgress
  };
};