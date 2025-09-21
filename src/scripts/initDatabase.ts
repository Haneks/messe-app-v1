#!/usr/bin/env node

/**
 * SCRIPT D'INITIALISATION DE LA BASE DE DONNÉES
 * ============================================
 * 
 * Script pour créer et initialiser la base de données
 * Peut être exécuté en ligne de commande
 */

import { DatabaseManager } from '../database/DatabaseManager';
import { FileImportService } from '../services/FileImportService';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

async function initializeDatabase() {
  console.log('🚀 Initialisation de la base de données de chants liturgiques...\n');

  try {
    // Créer les répertoires nécessaires
    const directories = ['./data', './uploads', './backups'];
    directories.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`📁 Répertoire créé: ${dir}`);
      }
    });

    // Initialiser la base de données
    const dbManager = DatabaseManager.getInstance('./data/songs.db');
    console.log('✅ Base de données initialisée');

    // Afficher les statistiques initiales
    const stats = dbManager.getStatistics();
    console.log('\n📊 Statistiques initiales:');
    console.log(`   - Total des chants: ${stats.totalSongs}`);
    console.log(`   - Chants par catégorie:`, stats.songsByCategory);
    console.log(`   - Imports récents: ${stats.recentImports}`);

    // Test d'importation si des fichiers d'exemple existent
    const exampleFiles = ['./examples/chants.txt', './examples/chants.docx'];
    const importService = new FileImportService();

    for (const filePath of exampleFiles) {
      if (existsSync(filePath)) {
        console.log(`\n📥 Test d'importation: ${filePath}`);
        
        try {
          const result = await importService.importFile(filePath, {
            autoDetectCategory: true,
            skipDuplicates: true
          });

          if (result.success) {
            console.log(`   ✅ ${result.totalImported}/${result.totalFound} chants importés`);
          } else {
            console.log(`   ❌ Échec d'importation:`, result.errors);
          }
        } catch (error) {
          console.log(`   ⚠️  Erreur d'importation:`, error);
        }
      }
    }

    // Statistiques finales
    const finalStats = dbManager.getStatistics();
    console.log('\n📊 Statistiques finales:');
    console.log(`   - Total des chants: ${finalStats.totalSongs}`);
    console.log(`   - Chants par catégorie:`, finalStats.songsByCategory);

    console.log('\n🎉 Initialisation terminée avec succès!');
    console.log('\n📝 Prochaines étapes:');
    console.log('   1. Placez vos fichiers .txt ou .docx dans le dossier ./uploads/');
    console.log('   2. Utilisez l\'API POST /api/songs/import pour importer');
    console.log('   3. Consultez les chants via GET /api/songs/search');

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  initializeDatabase();
}

export { initializeDatabase };