/**
 * GESTIONNAIRE DE BASE DE DONNÉES POUR CHANTS LITURGIQUES
 * =====================================================
 * 
 * Classe principale pour gérer toutes les opérations de base de données
 * Utilise SQLite avec better-sqlite3 pour des performances optimales
 */

import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface Song {
  id?: number;
  title: string;
  normalizedTitle?: string;
  lyrics: string;
  lyricsHash?: string;
  author?: string;
  melody?: string;
  category: 'entrance' | 'kyrie' | 'gloria' | 'offertory' | 'sanctus' | 'communion' | 'final' | 'other';
  language?: string;
  sourceFile?: string;
  importMethod?: 'manual' | 'txt_import' | 'docx_import' | 'api_import';
  createdAt?: Date;
  updatedAt?: Date;
  isActive?: boolean;
}

export interface ImportSession {
  id?: number;
  sessionId: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  totalSongs?: number;
  successfulImports?: number;
  failedImports?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ImportResult {
  success: boolean;
  sessionId: string;
  totalProcessed: number;
  successfulImports: number;
  failedImports: number;
  errors: string[];
  importedSongs: Song[];
}

export class DatabaseManager {
  private db: Database.Database;
  private static instance: DatabaseManager;

  private constructor(dbPath: string = './data/songs.db') {
    // Créer le répertoire data s'il n'existe pas
    const dbDir = join(process.cwd(), 'data');
    if (!existsSync(dbDir)) {
      require('fs').mkdirSync(dbDir, { recursive: true });
    }

    // Initialiser la base de données
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging pour de meilleures performances
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000');
    this.db.pragma('temp_store = MEMORY');
    
    this.initializeDatabase();
  }

  /**
   * Singleton pattern pour assurer une seule instance
   */
  public static getInstance(dbPath?: string): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(dbPath);
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialise la base de données avec le schéma
   */
  private initializeDatabase(): void {
    try {
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      
      // Exécuter le schéma par blocs (SQLite n'aime pas les gros scripts)
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      this.db.transaction(() => {
        for (const statement of statements) {
          if (statement.trim()) {
            this.db.exec(statement + ';');
          }
        }
      })();

      console.log('✅ Base de données initialisée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
      throw error;
    }
  }

  /**
   * OPÉRATIONS CRUD POUR LES CHANTS
   */

  /**
   * Crée un nouveau chant dans la base de données
   */
  public createSong(songData: Omit<Song, 'id'>): Song {
    const normalizedTitle = this.normalizeText(songData.title);
    const lyricsHash = this.generateLyricsHash(songData.lyrics);

    // Vérifier les doublons
    if (this.isDuplicate(lyricsHash)) {
      throw new Error(`Un chant avec des paroles similaires existe déjà`);
    }

    const stmt = this.db.prepare(`
      INSERT INTO songs (
        title, normalized_title, lyrics, lyrics_hash, author, melody, 
        category, language, source_file, import_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      songData.title,
      normalizedTitle,
      songData.lyrics,
      lyricsHash,
      songData.author || null,
      songData.melody || null,
      songData.category,
      songData.language || 'fr',
      songData.sourceFile || null,
      songData.importMethod || 'manual'
    );

    // Récupérer le chant créé
    const createdSong = this.getSongById(result.lastInsertRowid as number);
    
    // Enregistrer dans l'historique
    this.recordHistory(createdSong!.id!, 'created', null, createdSong);

    return createdSong!;
  }

  /**
   * Récupère un chant par son ID
   */
  public getSongById(id: number): Song | null {
    const stmt = this.db.prepare('SELECT * FROM songs WHERE id = ? AND is_active = 1');
    const row = stmt.get(id) as any;
    
    return row ? this.mapRowToSong(row) : null;
  }

  /**
   * Recherche des chants par titre (recherche floue)
   */
  public searchSongsByTitle(query: string, limit: number = 50): Song[] {
    const normalizedQuery = this.normalizeText(query);
    
    const stmt = this.db.prepare(`
      SELECT * FROM songs 
      WHERE normalized_title LIKE ? AND is_active = 1
      ORDER BY 
        CASE 
          WHEN normalized_title = ? THEN 1
          WHEN normalized_title LIKE ? THEN 2
          ELSE 3
        END,
        title
      LIMIT ?
    `);

    const rows = stmt.all(
      `%${normalizedQuery}%`,
      normalizedQuery,
      `${normalizedQuery}%`,
      limit
    ) as any[];

    return rows.map(row => this.mapRowToSong(row));
  }

  /**
   * Recherche full-text dans les chants
   */
  public fullTextSearch(query: string, limit: number = 50): Song[] {
    const stmt = this.db.prepare(`
      SELECT s.* FROM songs s
      JOIN songs_fts fts ON s.id = fts.rowid
      WHERE songs_fts MATCH ? AND s.is_active = 1
      ORDER BY rank
      LIMIT ?
    `);

    const rows = stmt.all(query, limit) as any[];
    return rows.map(row => this.mapRowToSong(row));
  }

  /**
   * Récupère tous les chants par catégorie
   */
  public getSongsByCategory(category: string, limit: number = 100): Song[] {
    const stmt = this.db.prepare(`
      SELECT * FROM songs 
      WHERE category = ? AND is_active = 1
      ORDER BY title
      LIMIT ?
    `);

    const rows = stmt.all(category, limit) as any[];
    return rows.map(row => this.mapRowToSong(row));
  }

  /**
   * Met à jour un chant existant
   */
  public updateSong(id: number, updates: Partial<Song>): Song {
    const existingSong = this.getSongById(id);
    if (!existingSong) {
      throw new Error(`Chant avec l'ID ${id} non trouvé`);
    }

    // Préparer les champs à mettre à jour
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title) {
      fields.push('title = ?', 'normalized_title = ?');
      values.push(updates.title, this.normalizeText(updates.title));
    }

    if (updates.lyrics) {
      const newHash = this.generateLyricsHash(updates.lyrics);
      if (newHash !== existingSong.lyricsHash && this.isDuplicate(newHash)) {
        throw new Error('Un chant avec ces paroles existe déjà');
      }
      fields.push('lyrics = ?', 'lyrics_hash = ?');
      values.push(updates.lyrics, newHash);
    }

    ['author', 'melody', 'category', 'language'].forEach(field => {
      if (updates[field as keyof Song] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field as keyof Song]);
      }
    });

    if (fields.length === 0) {
      return existingSong; // Aucune modification
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE songs 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(...values);

    const updatedSong = this.getSongById(id)!;
    
    // Enregistrer dans l'historique
    this.recordHistory(id, 'updated', existingSong, updatedSong);

    return updatedSong;
  }

  /**
   * Supprime un chant (suppression logique)
   */
  public deleteSong(id: number): boolean {
    const existingSong = this.getSongById(id);
    if (!existingSong) {
      return false;
    }

    const stmt = this.db.prepare('UPDATE songs SET is_active = 0 WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes > 0) {
      this.recordHistory(id, 'deleted', existingSong, null);
      return true;
    }

    return false;
  }

  /**
   * SYSTÈME D'IMPORTATION AUTOMATIQUE
   */

  /**
   * Démarre une session d'importation
   */
  public startImportSession(fileName: string, fileSize: number, fileType: string): string {
    const sessionId = this.generateUUID();
    
    const stmt = this.db.prepare(`
      INSERT INTO import_sessions (session_id, file_name, file_size, file_type, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);

    stmt.run(sessionId, fileName, fileSize, fileType);
    
    return sessionId;
  }

  /**
   * Met à jour le statut d'une session d'importation
   */
  public updateImportSession(sessionId: string, updates: Partial<ImportSession>): void {
    const fields: string[] = [];
    const values: any[] = [];

    ['status', 'totalSongs', 'successfulImports', 'failedImports', 'errorMessage'].forEach(field => {
      if (updates[field as keyof ImportSession] !== undefined) {
        fields.push(`${field.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`);
        values.push(updates[field as keyof ImportSession]);
      }
    });

    if (updates.status === 'completed' || updates.status === 'failed') {
      fields.push('completed_at = CURRENT_TIMESTAMP');
    }

    if (fields.length === 0) return;

    values.push(sessionId);

    const stmt = this.db.prepare(`
      UPDATE import_sessions 
      SET ${fields.join(', ')}
      WHERE session_id = ?
    `);

    stmt.run(...values);
  }

  /**
   * Importe plusieurs chants en une transaction
   */
  public importSongs(songs: Omit<Song, 'id'>[], sessionId: string): ImportResult {
    const result: ImportResult = {
      success: false,
      sessionId,
      totalProcessed: songs.length,
      successfulImports: 0,
      failedImports: 0,
      errors: [],
      importedSongs: []
    };

    // Mettre à jour le statut de la session
    this.updateImportSession(sessionId, { 
      status: 'processing', 
      totalSongs: songs.length 
    });

    // Transaction pour assurer la cohérence
    const transaction = this.db.transaction(() => {
      for (const songData of songs) {
        try {
          const importedSong = this.createSong(songData);
          result.importedSongs.push(importedSong);
          result.successfulImports++;
        } catch (error) {
          result.failedImports++;
          result.errors.push(`Erreur pour "${songData.title}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }
    });

    try {
      transaction();
      result.success = result.successfulImports > 0;
      
      this.updateImportSession(sessionId, {
        status: result.success ? 'completed' : 'failed',
        successfulImports: result.successfulImports,
        failedImports: result.failedImports,
        errorMessage: result.errors.length > 0 ? result.errors.join('; ') : undefined
      });

    } catch (error) {
      result.success = false;
      result.errors.push(`Erreur de transaction: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      
      this.updateImportSession(sessionId, {
        status: 'failed',
        errorMessage: result.errors.join('; ')
      });
    }

    return result;
  }

  /**
   * UTILITAIRES ET MÉTHODES PRIVÉES
   */

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^\w\s]/g, '') // Supprimer la ponctuation
      .replace(/\s+/g, ' ')
      .trim();
  }

  private generateLyricsHash(lyrics: string): string {
    const normalizedLyrics = this.normalizeText(lyrics);
    return createHash('sha256').update(normalizedLyrics).digest('hex');
  }

  private isDuplicate(lyricsHash: string): boolean {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM songs WHERE lyrics_hash = ? AND is_active = 1');
    const result = stmt.get(lyricsHash) as { count: number };
    return result.count > 0;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private mapRowToSong(row: any): Song {
    return {
      id: row.id,
      title: row.title,
      normalizedTitle: row.normalized_title,
      lyrics: row.lyrics,
      lyricsHash: row.lyrics_hash,
      author: row.author,
      melody: row.melody,
      category: row.category,
      language: row.language,
      sourceFile: row.source_file,
      importMethod: row.import_method,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      isActive: Boolean(row.is_active)
    };
  }

  private recordHistory(songId: number, action: string, oldData: any, newData: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO song_history (song_id, action, old_data, new_data)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      songId,
      action,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null
    );
  }

  /**
   * MÉTHODES DE STATISTIQUES ET MAINTENANCE
   */

  public getStatistics(): any {
    const stats = {
      totalSongs: 0,
      songsByCategory: {},
      recentImports: 0,
      databaseSize: 0
    };

    // Total des chants
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM songs WHERE is_active = 1');
    stats.totalSongs = (totalStmt.get() as any).count;

    // Chants par catégorie
    const categoryStmt = this.db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM songs 
      WHERE is_active = 1 
      GROUP BY category
    `);
    const categories = categoryStmt.all() as any[];
    categories.forEach(cat => {
      stats.songsByCategory[cat.category] = cat.count;
    });

    // Imports récents (7 derniers jours)
    const recentStmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM songs 
      WHERE created_at >= datetime('now', '-7 days') AND is_active = 1
    `);
    stats.recentImports = (recentStmt.get() as any).count;

    return stats;
  }

  /**
   * Ferme la connexion à la base de données
   */
  public close(): void {
    this.db.close();
  }

  /**
   * Sauvegarde la base de données
   */
  public backup(backupPath: string): void {
    this.db.backup(backupPath);
  }
}