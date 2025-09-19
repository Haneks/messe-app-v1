/**
 * Tests unitaires pour le hook useSongLibrary
 */

import { renderHook, act } from '@testing-library/react';
import { useSongLibrary } from '../hooks/useSongLibrary';
import { SongLibraryService } from '../services/songLibraryService';

// Mock du service
jest.mock('../services/songLibraryService');
const mockSongLibraryService = SongLibraryService as jest.Mocked<typeof SongLibraryService>;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useSongLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('devrait initialiser avec un état vide', () => {
    mockSongLibraryService.getCustomSongs.mockReturnValue([]);

    const { result } = renderHook(() => useSongLibrary());

    expect(result.current.customSongs).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('devrait charger les chants personnalisés au montage', () => {
    const mockSongs = [
      {
        id: 'test-1',
        title: 'Test Song',
        lyrics: 'Test lyrics',
        category: 'entrance' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCustom: true as const
      }
    ];

    mockSongLibraryService.getCustomSongs.mockReturnValue(mockSongs);

    const { result } = renderHook(() => useSongLibrary());

    expect(result.current.customSongs).toEqual(mockSongs);
    expect(mockSongLibraryService.getCustomSongs).toHaveBeenCalledTimes(1);
  });

  it('devrait sauvegarder un chant avec succès', async () => {
    const mockSong = {
      title: 'New Song',
      lyrics: 'New lyrics',
      category: 'communion' as const,
      order: 0
    };

    const mockSaveResult = {
      success: true,
      savedSong: {
        id: 'new-song-id',
        ...mockSong,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCustom: true as const
      }
    };

    mockSongLibraryService.saveToLibrary.mockResolvedValue(mockSaveResult);
    mockSongLibraryService.getCustomSongs.mockReturnValue([mockSaveResult.savedSong]);

    const { result } = renderHook(() => useSongLibrary());

    let saveResult;
    await act(async () => {
      saveResult = await result.current.saveToLibrary(mockSong);
    });

    expect(saveResult).toEqual(mockSaveResult);
    expect(result.current.lastSaveResult).toEqual(mockSaveResult);
    expect(result.current.error).toBe(null);
    expect(mockSongLibraryService.saveToLibrary).toHaveBeenCalledWith(mockSong);
  });

  it('devrait gérer les erreurs de sauvegarde', async () => {
    const mockSong = {
      title: '',
      lyrics: 'Test lyrics',
      category: 'entrance' as const,
      order: 0
    };

    const mockErrorResult = {
      success: false,
      error: 'Le titre est requis'
    };

    mockSongLibraryService.saveToLibrary.mockResolvedValue(mockErrorResult);

    const { result } = renderHook(() => useSongLibrary());

    let saveResult;
    await act(async () => {
      saveResult = await result.current.saveToLibrary(mockSong);
    });

    expect(saveResult).toEqual(mockErrorResult);
    expect(result.current.lastSaveResult).toEqual(mockErrorResult);
    expect(result.current.error).toBe('Le titre est requis');
  });

  it('devrait supprimer un chant avec succès', async () => {
    mockSongLibraryService.removeFromLibrary.mockReturnValue(true);
    mockSongLibraryService.getCustomSongs.mockReturnValue([]);

    const { result } = renderHook(() => useSongLibrary());

    let removeResult;
    await act(async () => {
      removeResult = await result.current.removeFromLibrary('test-id');
    });

    expect(removeResult).toBe(true);
    expect(mockSongLibraryService.removeFromLibrary).toHaveBeenCalledWith('test-id');
  });

  it('devrait gérer les erreurs de suppression', async () => {
    mockSongLibraryService.removeFromLibrary.mockReturnValue(false);

    const { result } = renderHook(() => useSongLibrary());

    let removeResult;
    await act(async () => {
      removeResult = await result.current.removeFromLibrary('non-existent-id');
    });

    expect(removeResult).toBe(false);
    expect(result.current.error).toBe('Chant non trouvé ou erreur de suppression');
  });

  it('devrait mettre à jour un chant avec succès', async () => {
    const mockUpdateResult = {
      success: true,
      savedSong: {
        id: 'test-id',
        title: 'Updated Title',
        lyrics: 'Updated lyrics',
        category: 'entrance' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCustom: true as const
      }
    };

    mockSongLibraryService.updateInLibrary.mockReturnValue(mockUpdateResult);
    mockSongLibraryService.getCustomSongs.mockReturnValue([mockUpdateResult.savedSong]);

    const { result } = renderHook(() => useSongLibrary());

    const updates = { title: 'Updated Title' };
    let updateResult;
    await act(async () => {
      updateResult = await result.current.updateInLibrary('test-id', updates);
    });

    expect(updateResult).toEqual(mockUpdateResult);
    expect(mockSongLibraryService.updateInLibrary).toHaveBeenCalledWith('test-id', updates);
  });

  it('devrait rafraîchir la bibliothèque', () => {
    const mockSongs = [
      {
        id: 'refreshed-song',
        title: 'Refreshed Song',
        lyrics: 'Refreshed lyrics',
        category: 'final' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCustom: true as const
      }
    ];

    mockSongLibraryService.getCustomSongs.mockReturnValue(mockSongs);

    const { result } = renderHook(() => useSongLibrary());

    act(() => {
      result.current.refreshLibrary();
    });

    expect(result.current.customSongs).toEqual(mockSongs);
  });

  it('devrait effacer les erreurs', () => {
    mockSongLibraryService.getCustomSongs.mockImplementation(() => {
      throw new Error('Test error');
    });

    const { result } = renderHook(() => useSongLibrary());

    // L'erreur devrait être présente
    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it('devrait exporter la bibliothèque', () => {
    const mockExportData = JSON.stringify([{ id: 'test', title: 'Test' }]);
    mockSongLibraryService.exportLibrary.mockReturnValue(mockExportData);

    const { result } = renderHook(() => useSongLibrary());

    const exportedData = result.current.exportLibrary();

    expect(exportedData).toBe(mockExportData);
    expect(mockSongLibraryService.exportLibrary).toHaveBeenCalled();
  });

  it('devrait importer une bibliothèque', async () => {
    const mockImportResult = {
      success: true,
      imported: 2,
    };

    mockSongLibraryService.importLibrary.mockReturnValue(mockImportResult);
    mockSongLibraryService.getCustomSongs.mockReturnValue([]);

    const { result } = renderHook(() => useSongLibrary());

    const importData = JSON.stringify([]);
    let importResult;
    await act(async () => {
      importResult = await result.current.importLibrary(importData);
    });

    expect(importResult).toEqual(mockImportResult);
    expect(mockSongLibraryService.importLibrary).toHaveBeenCalledWith(importData);
  });
});