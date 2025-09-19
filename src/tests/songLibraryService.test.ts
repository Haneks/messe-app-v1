/**
 * Tests unitaires pour le service de bibliothèque de chants
 */

import { SongLibraryService } from '../services/songLibraryService';
import { Song } from '../types/liturgy';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('SongLibraryService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('saveToLibrary', () => {
    const validSong: Omit<Song, 'id'> = {
      title: 'Test Song',
      lyrics: 'Test lyrics content',
      author: 'Test Author',
      melody: 'Test Melody',
      category: 'entrance',
      order: 0
    };

    it('devrait sauvegarder un chant valide avec succès', async () => {
      const result = await SongLibraryService.saveToLibrary(validSong);

      expect(result.success).toBe(true);
      expect(result.savedSong).toBeDefined();
      expect(result.savedSong?.title).toBe(validSong.title);
      expect(result.savedSong?.isCustom).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('devrait générer un ID unique pour chaque chant', async () => {
      const result1 = await SongLibraryService.saveToLibrary(validSong);
      const result2 = await SongLibraryService.saveToLibrary({
        ...validSong,
        title: 'Another Song'
      });

      expect(result1.savedSong?.id).toBeDefined();
      expect(result2.savedSong?.id).toBeDefined();
      expect(result1.savedSong?.id).not.toBe(result2.savedSong?.id);
    });

    it('devrait rejeter un chant sans titre', async () => {
      const invalidSong = { ...validSong, title: '' };
      const result = await SongLibraryService.saveToLibrary(invalidSong);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Le titre est requis');
    });

    it('devrait rejeter un chant sans paroles', async () => {
      const invalidSong = { ...validSong, lyrics: '' };
      const result = await SongLibraryService.saveToLibrary(invalidSong);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Les paroles sont requises');
    });

    it('devrait rejeter un titre trop long', async () => {
      const invalidSong = { ...validSong, title: 'a'.repeat(201) };
      const result = await SongLibraryService.saveToLibrary(invalidSong);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Le titre est trop long (max 200 caractères)');
    });

    it('devrait rejeter des paroles trop longues', async () => {
      const invalidSong = { ...validSong, lyrics: 'a'.repeat(10001) };
      const result = await SongLibraryService.saveToLibrary(invalidSong);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Les paroles sont trop longues (max 10000 caractères)');
    });

    it('devrait respecter la limite de chants personnalisés', async () => {
      // Remplir le stockage avec le maximum de chants
      const existingSongs = Array.from({ length: 100 }, (_, i) => ({
        id: `song-${i}`,
        title: `Song ${i}`,
        lyrics: `Lyrics ${i}`,
        category: 'other',
        createdAt: new Date(),
        updatedAt: new Date(),
        isCustom: true
      }));

      localStorage.setItem('liturgy_custom_songs', JSON.stringify(existingSongs));

      const result = await SongLibraryService.saveToLibrary(validSong);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Limite de 100 chants personnalisés atteinte');
    });
  });

  describe('getCustomSongs', () => {
    it('devrait retourner un tableau vide si aucun chant n\'est stocké', () => {
      const songs = SongLibraryService.getCustomSongs();
      expect(songs).toEqual([]);
    });

    it('devrait retourner les chants stockés', async () => {
      const song: Omit<Song, 'id'> = {
        title: 'Test Song',
        lyrics: 'Test lyrics',
        category: 'entrance',
        order: 0
      };

      await SongLibraryService.saveToLibrary(song);
      const songs = SongLibraryService.getCustomSongs();

      expect(songs).toHaveLength(1);
      expect(songs[0].title).toBe('Test Song');
      expect(songs[0].isCustom).toBe(true);
    });

    it('devrait filtrer les chants corrompus', () => {
      const corruptedData = [
        {
          id: 'valid-song',
          title: 'Valid Song',
          lyrics: 'Valid lyrics',
          category: 'entrance',
          createdAt: new Date(),
          updatedAt: new Date(),
          isCustom: true
        },
        {
          // Chant corrompu - manque des propriétés requises
          id: 'corrupted-song',
          title: 'Corrupted Song'
          // Manque lyrics, category, etc.
        }
      ];

      localStorage.setItem('liturgy_custom_songs', JSON.stringify(corruptedData));
      const songs = SongLibraryService.getCustomSongs();

      expect(songs).toHaveLength(1);
      expect(songs[0].id).toBe('valid-song');
    });
  });

  describe('removeFromLibrary', () => {
    it('devrait supprimer un chant existant', async () => {
      const song: Omit<Song, 'id'> = {
        title: 'Test Song',
        lyrics: 'Test lyrics',
        category: 'entrance',
        order: 0
      };

      const saveResult = await SongLibraryService.saveToLibrary(song);
      const songId = saveResult.savedSong!.id;

      const removeResult = SongLibraryService.removeFromLibrary(songId);
      expect(removeResult).toBe(true);

      const songs = SongLibraryService.getCustomSongs();
      expect(songs).toHaveLength(0);
    });

    it('devrait retourner false pour un chant inexistant', () => {
      const result = SongLibraryService.removeFromLibrary('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('updateInLibrary', () => {
    it('devrait mettre à jour un chant existant', async () => {
      const song: Omit<Song, 'id'> = {
        title: 'Original Title',
        lyrics: 'Original lyrics',
        category: 'entrance',
        order: 0
      };

      const saveResult = await SongLibraryService.saveToLibrary(song);
      const songId = saveResult.savedSong!.id;

      const updates = {
        title: 'Updated Title',
        lyrics: 'Updated lyrics'
      };

      const updateResult = SongLibraryService.updateInLibrary(songId, updates);

      expect(updateResult.success).toBe(true);
      expect(updateResult.savedSong?.title).toBe('Updated Title');
      expect(updateResult.savedSong?.lyrics).toBe('Updated lyrics');
    });

    it('devrait échouer pour un chant inexistant', () => {
      const result = SongLibraryService.updateInLibrary('non-existent-id', {
        title: 'New Title'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chant non trouvé dans la bibliothèque');
    });
  });

  describe('cleanupLibrary', () => {
    it('devrait supprimer les chants corrompus', () => {
      const mixedData = [
        {
          id: 'valid-song',
          title: 'Valid Song',
          lyrics: 'Valid lyrics',
          category: 'entrance',
          createdAt: new Date(),
          updatedAt: new Date(),
          isCustom: true
        },
        {
          id: 'corrupted-song-1',
          title: 'Corrupted Song 1'
          // Manque des propriétés requises
        },
        {
          id: 'corrupted-song-2'
          // Manque title et autres propriétés
        }
      ];

      localStorage.setItem('liturgy_custom_songs', JSON.stringify(mixedData));
      
      const removedCount = SongLibraryService.cleanupLibrary();
      expect(removedCount).toBe(2);

      const songs = SongLibraryService.getCustomSongs();
      expect(songs).toHaveLength(1);
      expect(songs[0].id).toBe('valid-song');
    });
  });

  describe('exportLibrary et importLibrary', () => {
    it('devrait exporter et importer la bibliothèque', async () => {
      // Créer quelques chants
      await SongLibraryService.saveToLibrary({
        title: 'Song 1',
        lyrics: 'Lyrics 1',
        category: 'entrance',
        order: 0
      });

      await SongLibraryService.saveToLibrary({
        title: 'Song 2',
        lyrics: 'Lyrics 2',
        category: 'communion',
        order: 0
      });

      // Exporter
      const exportedData = SongLibraryService.exportLibrary();
      expect(exportedData).toBeDefined();

      // Vider la bibliothèque
      localStorage.clear();

      // Importer
      const importResult = SongLibraryService.importLibrary(exportedData);
      expect(importResult.success).toBe(true);
      expect(importResult.imported).toBe(2);

      // Vérifier que les chants sont bien importés
      const songs = SongLibraryService.getCustomSongs();
      expect(songs).toHaveLength(2);
    });

    it('devrait rejeter des données d\'import invalides', () => {
      const result = SongLibraryService.importLibrary('invalid json');
      expect(result.success).toBe(false);
      expect(result.imported).toBe(0);
      expect(result.error).toBeDefined();
    });
  });
});