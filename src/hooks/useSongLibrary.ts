/**
 * Hook personnalisé pour gérer l'interaction avec la bibliothèque de chants
 */

import { useState, useEffect, useCallback } from 'react';
import { Song } from '../types/liturgy';
import { SongLibraryService, CustomSong, LibrarySaveResult } from '../services/songLibraryService';

export interface SongLibraryState {
  customSongs: CustomSong[];
  loading: boolean;
  error: string | null;
  lastSaveResult: LibrarySaveResult | null;
}

export interface SongLibraryActions {
  saveToLibrary: (song: Omit<Song, 'id'>) => Promise<LibrarySaveResult>;
  removeFromLibrary: (songId: string) => Promise<boolean>;
  updateInLibrary: (songId: string, updates: Partial<Omit<Song, 'id'>>) => Promise<LibrarySaveResult>;
  refreshLibrary: () => void;
  clearError: () => void;
  exportLibrary: () => string;
  importLibrary: (jsonData: string) => Promise<{ success: boolean; imported: number; error?: string }>;
}

/**
 * Hook pour gérer la bibliothèque de chants personnalisés
 */
export const useSongLibrary = (): SongLibraryState & SongLibraryActions => {
  const [state, setState] = useState<SongLibraryState>({
    customSongs: [],
    loading: true,
    error: null,
    lastSaveResult: null
  });

  // Charger les chants personnalisés au montage
  useEffect(() => {
    loadCustomSongs();
  }, []);

  /**
   * Charge les chants personnalisés depuis le stockage
   */
  const loadCustomSongs = useCallback(() => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const customSongs = SongLibraryService.getCustomSongs();
      
      setState(prev => ({
        ...prev,
        customSongs,
        loading: false
      }));

      console.log(`📚 ${customSongs.length} chants personnalisés chargés`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de chargement';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      console.error('Erreur lors du chargement des chants personnalisés:', error);
    }
  }, []);

  /**
   * Sauvegarde automatiquement un chant dans la bibliothèque
   */
  const saveToLibrary = useCallback(async (song: Omit<Song, 'id'>): Promise<LibrarySaveResult> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const result = await SongLibraryService.saveToLibrary(song);
      
      setState(prev => ({
        ...prev,
        lastSaveResult: result,
        error: result.success ? null : result.error || 'Erreur de sauvegarde'
      }));

      // Recharger la liste si la sauvegarde a réussi
      if (result.success) {
        loadCustomSongs();
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      const failureResult: LibrarySaveResult = {
        success: false,
        error: errorMessage
      };

      setState(prev => ({
        ...prev,
        lastSaveResult: failureResult,
        error: errorMessage
      }));

      return failureResult;
    }
  }, [loadCustomSongs]);

  /**
   * Supprime un chant de la bibliothèque
   */
  const removeFromLibrary = useCallback(async (songId: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const success = SongLibraryService.removeFromLibrary(songId);
      
      if (success) {
        loadCustomSongs();
      } else {
        setState(prev => ({
          ...prev,
          error: 'Chant non trouvé ou erreur de suppression'
        }));
      }

      return success;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de suppression';
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [loadCustomSongs]);

  /**
   * Met à jour un chant dans la bibliothèque
   */
  const updateInLibrary = useCallback(async (
    songId: string, 
    updates: Partial<Omit<Song, 'id'>>
  ): Promise<LibrarySaveResult> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const result = SongLibraryService.updateInLibrary(songId, updates);
      
      setState(prev => ({
        ...prev,
        lastSaveResult: result,
        error: result.success ? null : result.error || 'Erreur de mise à jour'
      }));

      if (result.success) {
        loadCustomSongs();
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      const failureResult: LibrarySaveResult = {
        success: false,
        error: errorMessage
      };

      setState(prev => ({
        ...prev,
        lastSaveResult: failureResult,
        error: errorMessage
      }));

      return failureResult;
    }
  }, [loadCustomSongs]);

  /**
   * Rafraîchit la bibliothèque
   */
  const refreshLibrary = useCallback(() => {
    loadCustomSongs();
  }, [loadCustomSongs]);

  /**
   * Efface l'erreur courante
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Exporte la bibliothèque
   */
  const exportLibrary = useCallback((): string => {
    return SongLibraryService.exportLibrary();
  }, []);

  /**
   * Importe une bibliothèque
   */
  const importLibrary = useCallback(async (jsonData: string) => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const result = SongLibraryService.importLibrary(jsonData);
      
      if (result.success) {
        loadCustomSongs();
      } else {
        setState(prev => ({ ...prev, error: result.error }));
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur d\'importation';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      return {
        success: false,
        imported: 0,
        error: errorMessage
      };
    }
  }, [loadCustomSongs]);

  return {
    // État
    ...state,
    
    // Actions
    saveToLibrary,
    removeFromLibrary,
    updateInLibrary,
    refreshLibrary,
    clearError,
    exportLibrary,
    importLibrary
  };
};