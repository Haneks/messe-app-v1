/**
 * Service de gestion de la bibliothèque de chants
 * Gère la persistance et la récupération des chants personnalisés
 */

import { Song } from '../types/liturgy';
import { SongTemplate } from '../data/songLibrary';

export interface CustomSong extends SongTemplate {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  isCustom: true;
}

export interface LibrarySaveResult {
  success: boolean;
  error?: string;
  savedSong?: CustomSong;
}

/**
 * Service pour gérer la bibliothèque de chants personnalisés
 */
export class SongLibraryService {
  private static readonly STORAGE_KEY = 'liturgy_custom_songs';
  private static readonly MAX_CUSTOM_SONGS = 100;

  /**
   * Sauvegarde automatiquement un nouveau chant dans la bibliothèque
   */
  static async saveToLibrary(song: Omit<Song, 'id'>): Promise<LibrarySaveResult> {
    try {
      // Validation des données d'entrée
      const validationResult = this.validateSongData(song);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error
        };
      }

      // Récupérer les chants existants
      const existingSongs = this.getCustomSongs();

      // Vérifier les doublons
      const duplicateCheck = this.checkForDuplicates(song, existingSongs);
      if (duplicateCheck.isDuplicate) {
        console.warn('Chant similaire détecté, sauvegarde quand même avec un identifiant unique');
      }

      // Vérifier la limite de stockage
      if (existingSongs.length >= this.MAX_CUSTOM_SONGS) {
        return {
          success: false,
          error: `Limite de ${this.MAX_CUSTOM_SONGS} chants personnalisés atteinte`
        };
      }

      // Créer le chant personnalisé
      const customSong: CustomSong = {
        id: this.generateUniqueId(),
        title: song.title,
        lyrics: song.lyrics,
        author: song.author,
        melody: song.melody,
        category: song.category,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCustom: true
      };

      // Sauvegarder dans le localStorage
      const updatedSongs = [...existingSongs, customSong];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedSongs));

      console.log(`✅ Chant "${song.title}" ajouté automatiquement à la bibliothèque`);

      return {
        success: true,
        savedSong: customSong
      };

    } catch (error) {
      console.error('Erreur lors de la sauvegarde dans la bibliothèque:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de la sauvegarde'
      };
    }
  }

  /**
   * Récupère tous les chants personnalisés de la bibliothèque
   */
  static getCustomSongs(): CustomSong[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const songs = JSON.parse(stored);
      
      // Validation et nettoyage des données
      return songs
        .filter((song: any) => this.isValidCustomSong(song))
        .map((song: any) => ({
          ...song,
          createdAt: new Date(song.createdAt),
          updatedAt: new Date(song.updatedAt)
        }));

    } catch (error) {
      console.error('Erreur lors de la récupération des chants personnalisés:', error);
      return [];
    }
  }

  /**
   * Supprime un chant personnalisé de la bibliothèque
   */
  static removeFromLibrary(songId: string): boolean {
    try {
      const existingSongs = this.getCustomSongs();
      const filteredSongs = existingSongs.filter(song => song.id !== songId);
      
      if (filteredSongs.length === existingSongs.length) {
        return false; // Chant non trouvé
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredSongs));
      console.log(`🗑️ Chant supprimé de la bibliothèque: ${songId}`);
      return true;

    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      return false;
    }
  }

  /**
   * Met à jour un chant existant dans la bibliothèque
   */
  static updateInLibrary(songId: string, updates: Partial<Omit<Song, 'id'>>): LibrarySaveResult {
    try {
      const existingSongs = this.getCustomSongs();
      const songIndex = existingSongs.findIndex(song => song.id === songId);

      if (songIndex === -1) {
        return {
          success: false,
          error: 'Chant non trouvé dans la bibliothèque'
        };
      }

      // Mettre à jour le chant
      const updatedSong: CustomSong = {
        ...existingSongs[songIndex],
        ...updates,
        updatedAt: new Date()
      };

      // Validation des nouvelles données
      const validationResult = this.validateSongData(updatedSong);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error
        };
      }

      existingSongs[songIndex] = updatedSong;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingSongs));

      return {
        success: true,
        savedSong: updatedSong
      };

    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Nettoie la bibliothèque (supprime les chants corrompus)
   */
  static cleanupLibrary(): number {
    try {
      const songs = this.getCustomSongs();
      const validSongs = songs.filter(song => this.isValidCustomSong(song));
      
      if (validSongs.length !== songs.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validSongs));
        const removedCount = songs.length - validSongs.length;
        console.log(`🧹 Nettoyage de la bibliothèque: ${removedCount} chants corrompus supprimés`);
        return removedCount;
      }

      return 0;
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
      return 0;
    }
  }

  /**
   * Exporte la bibliothèque personnalisée
   */
  static exportLibrary(): string {
    const songs = this.getCustomSongs();
    return JSON.stringify(songs, null, 2);
  }

  /**
   * Importe une bibliothèque (remplace l'existante)
   */
  static importLibrary(jsonData: string): { success: boolean; imported: number; error?: string } {
    try {
      const importedSongs = JSON.parse(jsonData);
      
      if (!Array.isArray(importedSongs)) {
        return {
          success: false,
          imported: 0,
          error: 'Format de données invalide'
        };
      }

      const validSongs = importedSongs
        .filter(song => this.isValidCustomSong(song))
        .slice(0, this.MAX_CUSTOM_SONGS); // Limiter le nombre

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validSongs));

      return {
        success: true,
        imported: validSongs.length
      };

    } catch (error) {
      return {
        success: false,
        imported: 0,
        error: error instanceof Error ? error.message : 'Erreur d\'importation'
      };
    }
  }

  // Méthodes privées utilitaires

  private static validateSongData(song: Partial<Song>): { isValid: boolean; error?: string } {
    if (!song.title || song.title.trim().length === 0) {
      return { isValid: false, error: 'Le titre est requis' };
    }

    if (!song.lyrics || song.lyrics.trim().length === 0) {
      return { isValid: false, error: 'Les paroles sont requises' };
    }

    if (song.title.length > 200) {
      return { isValid: false, error: 'Le titre est trop long (max 200 caractères)' };
    }

    if (song.lyrics.length > 10000) {
      return { isValid: false, error: 'Les paroles sont trop longues (max 10000 caractères)' };
    }

    return { isValid: true };
  }

  private static checkForDuplicates(newSong: Omit<Song, 'id'>, existingSongs: CustomSong[]): { isDuplicate: boolean; similarSong?: CustomSong } {
    const normalizeText = (text: string) => text.toLowerCase().trim().replace(/\s+/g, ' ');
    
    const newTitle = normalizeText(newSong.title);
    const newLyrics = normalizeText(newSong.lyrics);

    for (const existingSong of existingSongs) {
      const existingTitle = normalizeText(existingSong.title);
      const existingLyrics = normalizeText(existingSong.lyrics);

      // Vérification titre exact
      if (newTitle === existingTitle) {
        return { isDuplicate: true, similarSong: existingSong };
      }

      // Vérification similarité des paroles (premiers 100 caractères)
      if (newLyrics.substring(0, 100) === existingLyrics.substring(0, 100)) {
        return { isDuplicate: true, similarSong: existingSong };
      }
    }

    return { isDuplicate: false };
  }

  private static isValidCustomSong(song: any): song is CustomSong {
    return (
      song &&
      typeof song.id === 'string' &&
      typeof song.title === 'string' &&
      typeof song.lyrics === 'string' &&
      typeof song.category === 'string' &&
      song.isCustom === true &&
      song.createdAt &&
      song.updatedAt
    );
  }

  private static generateUniqueId(): string {
    return `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}