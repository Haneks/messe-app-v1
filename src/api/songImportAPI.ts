/**
 * API REST POUR L'IMPORTATION DE CHANTS
 * ====================================
 * 
 * Interface HTTP pour déclencher l'importation de fichiers
 * Endpoints RESTful avec gestion d'erreurs et validation
 */

import { Request, Response } from 'express';
import multer from 'multer';
import { FileImportService } from '../services/FileImportService';
import { DatabaseManager } from '../database/DatabaseManager';
import { join } from 'path';
import { unlink } from 'fs/promises';

// Configuration multer pour upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.docx'];
    const fileExtension = '.' + file.originalname.split('.').pop()?.toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non supporté. Utilisez .txt ou .docx'));
    }
  }
});

export class SongImportAPI {
  private importService: FileImportService;
  private dbManager: DatabaseManager;

  constructor() {
    this.importService = new FileImportService();
    this.dbManager = DatabaseManager.getInstance();
  }

  /**
   * POST /api/songs/import
   * Importe un fichier de chants
   */
  public importFile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Aucun fichier fourni'
        });
        return;
      }

      // Options d'importation depuis les paramètres de requête
      const options = {
        defaultCategory: req.body.defaultCategory || 'other',
        autoDetectCategory: req.body.autoDetectCategory !== 'false',
        preserveFormatting: req.body.preserveFormatting === 'true',
        skipDuplicates: req.body.skipDuplicates !== 'false'
      };

      // Lancer l'importation
      const result = await this.importService.importFile(req.file.path, options);

      // Nettoyer le fichier temporaire
      try {
        await unlink(req.file.path);
      } catch (error) {
        console.warn('Impossible de supprimer le fichier temporaire:', error);
      }

      // Réponse selon le résultat
      if (result.success) {
        res.status(200).json({
          success: true,
          message: `Import réussi: ${result.totalImported}/${result.totalFound} chants importés`,
          data: {
            sessionId: result.sessionId,
            fileName: result.fileName,
            totalFound: result.totalFound,
            totalImported: result.totalImported,
            skipped: result.skipped,
            songs: result.songs.map(song => ({
              id: song.id,
              title: song.title,
              category: song.category,
              author: song.author
            }))
          },
          warnings: result.errors.length > 0 ? result.errors : undefined
        });
      } else {
        res.status(422).json({
          success: false,
          error: 'Échec de l\'importation',
          details: result.errors
        });
      }

    } catch (error) {
      console.error('Erreur API importation:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de l\'importation',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  };

  /**
   * GET /api/songs/search
   * Recherche de chants
   */
  public searchSongs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q, category, limit = 50, type = 'title' } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Paramètre de recherche "q" requis'
        });
        return;
      }

      let songs;
      const searchLimit = Math.min(parseInt(limit as string) || 50, 100);

      switch (type) {
        case 'fulltext':
          songs = this.dbManager.fullTextSearch(q, searchLimit);
          break;
        case 'category':
          if (category && typeof category === 'string') {
            songs = this.dbManager.getSongsByCategory(category, searchLimit);
          } else {
            songs = this.dbManager.searchSongsByTitle(q, searchLimit);
          }
          break;
        default:
          songs = this.dbManager.searchSongsByTitle(q, searchLimit);
      }

      res.status(200).json({
        success: true,
        data: {
          query: q,
          total: songs.length,
          songs: songs.map(song => ({
            id: song.id,
            title: song.title,
            author: song.author,
            category: song.category,
            createdAt: song.createdAt,
            preview: song.lyrics.substring(0, 150) + '...'
          }))
        }
      });

    } catch (error) {
      console.error('Erreur API recherche:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la recherche'
      });
    }
  };

  /**
   * GET /api/songs/:id
   * Récupère un chant par ID
   */
  public getSong = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const songId = parseInt(id);

      if (isNaN(songId)) {
        res.status(400).json({
          success: false,
          error: 'ID de chant invalide'
        });
        return;
      }

      const song = this.dbManager.getSongById(songId);

      if (!song) {
        res.status(404).json({
          success: false,
          error: 'Chant non trouvé'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: song
      });

    } catch (error) {
      console.error('Erreur API récupération chant:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  };

  /**
   * GET /api/songs/stats
   * Statistiques de la base de données
   */
  public getStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.dbManager.getStatistics();

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erreur API statistiques:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des statistiques'
      });
    }
  };

  /**
   * Middleware multer pour upload
   */
  public uploadMiddleware = upload.single('file');
}

// Export des routes configurées
export const songImportRoutes = (app: any) => {
  const api = new SongImportAPI();

  // Routes d'importation
  app.post('/api/songs/import', api.uploadMiddleware, api.importFile);
  
  // Routes de consultation
  app.get('/api/songs/search', api.searchSongs);
  app.get('/api/songs/stats', api.getStatistics);
  app.get('/api/songs/:id', api.getSong);
};