/**
 * SERVICE D'IMPORTATION DE FICHIERS
 * ================================
 * 
 * Service spécialisé dans l'importation et le parsing de fichiers
 * Supporte les formats .txt et .docx avec extraction intelligente
 */

import mammoth from 'mammoth';
import { DatabaseManager, Song } from '../database/DatabaseManager';
import { readFile } from 'fs/promises';
import { extname } from 'path';

export interface ParsedSong {
  title: string;
  lyrics: string;
  author?: string;
  melody?: string;
  category: Song['category'];
  metadata: Record<string, any>;
}

export interface ImportOptions {
  defaultCategory?: Song['category'];
  autoDetectCategory?: boolean;
  preserveFormatting?: boolean;
  skipDuplicates?: boolean;
}

export interface FileImportResult {
  success: boolean;
  sessionId: string;
  fileName: string;
  totalFound: number;
  totalImported: number;
  skipped: number;
  errors: string[];
  songs: Song[];
}

export class FileImportService {
  private dbManager: DatabaseManager;

  constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  /**
   * Importe un fichier (point d'entrée principal)
   */
  public async importFile(
    filePath: string, 
    options: ImportOptions = {}
  ): Promise<FileImportResult> {
    const fileName = filePath.split('/').pop() || 'unknown';
    const fileExtension = extname(filePath).toLowerCase();
    
    // Démarrer une session d'importation
    const sessionId = this.dbManager.startImportSession(
      fileName, 
      0, // Taille sera mise à jour
      fileExtension
    );

    const result: FileImportResult = {
      success: false,
      sessionId,
      fileName,
      totalFound: 0,
      totalImported: 0,
      skipped: 0,
      errors: [],
      songs: []
    };

    try {
      // Parser le fichier selon son type
      let parsedSongs: ParsedSong[] = [];
      
      switch (fileExtension) {
        case '.txt':
          parsedSongs = await this.parseTxtFile(filePath, options);
          break;
        case '.docx':
          parsedSongs = await this.parseDocxFile(filePath, options);
          break;
        default:
          throw new Error(`Format de fichier non supporté: ${fileExtension}`);
      }

      result.totalFound = parsedSongs.length;

      // Convertir en format Song et importer
      const songsToImport: Omit<Song, 'id'>[] = parsedSongs.map(parsed => ({
        title: parsed.title,
        lyrics: parsed.lyrics,
        author: parsed.author,
        melody: parsed.melody,
        category: parsed.category,
        sourceFile: fileName,
        importMethod: fileExtension === '.txt' ? 'txt_import' : 'docx_import'
      }));

      // Importer en base de données
      const importResult = this.dbManager.importSongs(songsToImport, sessionId);
      
      result.success = importResult.success;
      result.totalImported = importResult.successfulImports;
      result.skipped = importResult.failedImports;
      result.errors = importResult.errors;
      result.songs = importResult.importedSongs;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Erreur inconnue');
      this.dbManager.updateImportSession(sessionId, {
        status: 'failed',
        errorMessage: result.errors.join('; ')
      });
    }

    return result;
  }

  /**
   * Parse un fichier texte (.txt)
   */
  private async parseTxtFile(filePath: string, options: ImportOptions): Promise<ParsedSong[]> {
    try {
      const content = await readFile(filePath, 'utf8');
      return this.parseTextContent(content, options);
    } catch (error) {
      throw new Error(`Erreur lecture fichier TXT: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Parse un fichier Word (.docx)
   */
  private async parseDocxFile(filePath: string, options: ImportOptions): Promise<ParsedSong[]> {
    try {
      const buffer = await readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return this.parseTextContent(result.value, options);
    } catch (error) {
      throw new Error(`Erreur lecture fichier DOCX: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Parse le contenu textuel et extrait les chants
   */
  private parseTextContent(content: string, options: ImportOptions): ParsedSong[] {
    const songs: ParsedSong[] = [];
    
    // Normaliser les fins de ligne
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Stratégies de parsing multiples
    const strategies = [
      () => this.parseByTitleMarkers(normalizedContent, options),
      () => this.parseByEmptyLines(normalizedContent, options),
      () => this.parseAsSingleSong(normalizedContent, options)
    ];

    // Essayer chaque stratégie jusqu'à en trouver une qui fonctionne
    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result.length > 0) {
          songs.push(...result);
          break;
        }
      } catch (error) {
        console.warn('Stratégie de parsing échouée:', error);
      }
    }

    return songs;
  }

  /**
   * Stratégie 1: Parser par marqueurs de titre (TITRE:, #, etc.)
   */
  private parseByTitleMarkers(content: string, options: ImportOptions): ParsedSong[] {
    const songs: ParsedSong[] = [];
    const lines = content.split('\n');
    
    let currentSong: Partial<ParsedSong> | null = null;
    let currentLyrics: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Détecter les marqueurs de titre
      const titleMatch = line.match(/^(?:TITRE?:|#|CHANT:)\s*(.+)$/i) ||
                        line.match(/^(.+)$/i) && this.looksLikeTitle(line);

      if (titleMatch && titleMatch[1]) {
        // Sauvegarder le chant précédent
        if (currentSong && currentLyrics.length > 0) {
          songs.push(this.finalizeParsedSong(currentSong, currentLyrics.join('\n'), options));
        }

        // Commencer un nouveau chant
        currentSong = {
          title: titleMatch[1].trim(),
          metadata: {}
        };
        currentLyrics = [];
      } else if (currentSong) {
        // Détecter les métadonnées
        const metaMatch = line.match(/^(AUTEUR|AUTHOR|MÉLODIE|MELODY|CATÉGORIE|CATEGORY):\s*(.+)$/i);
        if (metaMatch) {
          const key = metaMatch[1].toLowerCase();
          const value = metaMatch[2].trim();
          
          if (key.includes('auteur') || key.includes('author')) {
            currentSong.author = value;
          } else if (key.includes('mélodie') || key.includes('melody')) {
            currentSong.melody = value;
          } else if (key.includes('catégorie') || key.includes('category')) {
            currentSong.category = this.mapCategoryString(value);
          }
        } else if (line.length > 0) {
          // Ajouter aux paroles
          currentLyrics.push(line);
        }
      }
    }

    // Sauvegarder le dernier chant
    if (currentSong && currentLyrics.length > 0) {
      songs.push(this.finalizeParsedSong(currentSong, currentLyrics.join('\n'), options));
    }

    return songs;
  }

  /**
   * Stratégie 2: Parser par séparation avec lignes vides
   */
  private parseByEmptyLines(content: string, options: ImportOptions): ParsedSong[] {
    const songs: ParsedSong[] = [];
    const sections = content.split(/\n\s*\n\s*\n/); // 2+ lignes vides

    for (const section of sections) {
      const trimmedSection = section.trim();
      if (trimmedSection.length < 20) continue; // Trop court pour être un chant

      const lines = trimmedSection.split('\n');
      const title = this.extractTitleFromSection(lines);
      const lyrics = lines.slice(title ? 1 : 0).join('\n').trim();

      if (lyrics.length > 10) {
        songs.push(this.finalizeParsedSong({
          title: title || `Chant ${songs.length + 1}`,
          metadata: {}
        }, lyrics, options));
      }
    }

    return songs;
  }

  /**
   * Stratégie 3: Traiter comme un seul chant
   */
  private parseAsSingleSong(content: string, options: ImportOptions): ParsedSong[] {
    const lines = content.split('\n');
    const title = this.extractTitleFromSection(lines) || 'Chant importé';
    const lyrics = content.trim();

    if (lyrics.length < 10) {
      return [];
    }

    return [this.finalizeParsedSong({
      title,
      metadata: {}
    }, lyrics, options)];
  }

  /**
   * MÉTHODES UTILITAIRES
   */

  private looksLikeTitle(line: string): boolean {
    return line.length < 100 && 
           line.length > 3 && 
           !line.includes('\t') &&
           !line.match(/^(R\/|Refrain|Couplet|\d+\.)/i) &&
           line.split(' ').length <= 10;
  }

  private extractTitleFromSection(lines: string[]): string | null {
    for (const line of lines.slice(0, 3)) { // Chercher dans les 3 premières lignes
      const trimmed = line.trim();
      if (this.looksLikeTitle(trimmed)) {
        return trimmed;
      }
    }
    return null;
  }

  private mapCategoryString(categoryStr: string): Song['category'] {
    const normalized = categoryStr.toLowerCase();
    
    const categoryMap: Record<string, Song['category']> = {
      'entrée': 'entrance',
      'entrance': 'entrance',
      'kyrie': 'kyrie',
      'gloria': 'gloria',
      'gloire': 'gloria',
      'offertoire': 'offertory',
      'offertory': 'offertory',
      'sanctus': 'sanctus',
      'saint': 'sanctus',
      'communion': 'communion',
      'sortie': 'final',
      'final': 'final',
      'envoi': 'final'
    };

    return categoryMap[normalized] || 'other';
  }

  private detectCategoryFromContent(title: string, lyrics: string): Song['category'] {
    const content = (title + ' ' + lyrics).toLowerCase();
    
    const patterns = {
      entrance: ['entrée', 'accueil', 'rassemblement', 'venez', 'entrons'],
      kyrie: ['kyrie', 'pitié', 'seigneur prends pitié'],
      gloria: ['gloria', 'gloire à dieu', 'gloire au plus haut'],
      offertory: ['offertoire', 'présentation', 'pain', 'vin', 'offrande'],
      sanctus: ['sanctus', 'saint', 'hosanna'],
      communion: ['communion', 'pain de vie', 'corps du christ', 'goûtez'],
      final: ['envoi', 'sortie', 'allez', 'mission', 'marie']
    };

    for (const [category, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return category as Song['category'];
      }
    }

    return 'other';
  }

  private finalizeParsedSong(
    partial: Partial<ParsedSong>, 
    lyrics: string, 
    options: ImportOptions
  ): ParsedSong {
    const title = partial.title || 'Chant sans titre';
    
    return {
      title,
      lyrics: lyrics.trim(),
      author: partial.author,
      melody: partial.melody,
      category: partial.category || 
                (options.autoDetectCategory !== false ? 
                 this.detectCategoryFromContent(title, lyrics) : 
                 options.defaultCategory || 'other'),
      metadata: partial.metadata || {}
    };
  }
}