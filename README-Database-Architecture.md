# 🗄️ Architecture de Base de Données pour Gestion de Chants Liturgiques

## 📋 Vue d'ensemble

Cette solution complète implémente un système de base de données robuste et scalable pour la gestion automatisée de chants liturgiques avec importation depuis fichiers texte (.txt) et Word (.docx).

## 🏗️ Architecture Technique

### **Choix du SGBD : SQLite**

**Justification :**
- ✅ **Stockage local** : Fichier unique, pas de serveur requis
- ✅ **Performance** : Excellent pour 10k+ chants
- ✅ **Portabilité** : Fonctionne sur tous les OS
- ✅ **Simplicité** : Zéro configuration
- ✅ **ACID** : Transactions complètes
- ✅ **Full-Text Search** : Recherche intégrée avec FTS5

## 📊 Schéma de Base de Données

### **Tables Principales**

#### 1. **`songs`** - Table centrale des chants
```sql
- id (PK, AUTO_INCREMENT)
- title (VARCHAR 255, NOT NULL)
- normalized_title (VARCHAR 255) -- Recherche insensible casse
- lyrics (TEXT, NOT NULL)
- lyrics_hash (VARCHAR 64) -- SHA-256 pour doublons
- author, melody, category
- source_file, import_method
- created_at, updated_at, is_active
```

#### 2. **`song_metadata`** - Métadonnées étendues
```sql
- Stockage clé-valeur flexible
- Relation 1:N avec songs
- Extensibilité future
```

#### 3. **`song_tags`** - Système de tags
```sql
- Classification avancée
- Recherche par étiquettes
- Relation N:N avec songs
```

#### 4. **`import_sessions`** - Traçabilité des imports
```sql
- Historique complet des importations
- Statistiques de succès/échec
- Debugging et audit
```

### **Optimisations de Performance**

#### **Index Stratégiques**
- `idx_songs_title` : Recherche par titre
- `idx_songs_normalized_title` : Recherche insensible casse
- `idx_songs_category` : Filtrage par catégorie
- `idx_songs_lyrics_hash` : Détection doublons (UNIQUE)

#### **Recherche Full-Text (FTS5)**
```sql
CREATE VIRTUAL TABLE songs_fts USING fts5(
    title, lyrics, author, 
    content='songs', content_rowid='id'
);
```

#### **Triggers Automatiques**
- Synchronisation FTS5
- Mise à jour `updated_at`
- Historique des modifications

## 🔧 Classes et Services

### **1. DatabaseManager** - Gestionnaire principal
```typescript
// Singleton pattern pour cohérence
const db = DatabaseManager.getInstance();

// CRUD complet
const song = db.createSong(songData);
const results = db.searchSongsByTitle("kyrie");
const ftsResults = db.fullTextSearch("alléluia");
```

**Fonctionnalités :**
- ✅ Gestion des connexions SQLite
- ✅ Transactions ACID
- ✅ Détection de doublons intelligente
- ✅ Recherche multi-critères
- ✅ Statistiques et maintenance

### **2. FileImportService** - Importation automatique
```typescript
const importer = new FileImportService();
const result = await importer.importFile('./chants.txt', {
    autoDetectCategory: true,
    skipDuplicates: true
});
```

**Stratégies de Parsing :**
1. **Par marqueurs** : `TITRE:`, `#`, `CHANT:`
2. **Par lignes vides** : Séparation automatique
3. **Chant unique** : Fallback intelligent

**Formats Supportés :**
- ✅ **Fichiers .txt** (UTF-8 recommandé)
- ✅ **Documents .docx** (extraction via mammoth)
- ✅ **Métadonnées** : Auteur, mélodie, catégorie
- ✅ **Auto-détection** : Catégorie par mots-clés

### **3. SongImportAPI** - Interface REST
```typescript
POST /api/songs/import     // Import fichier
GET  /api/songs/search     // Recherche
GET  /api/songs/:id        // Chant spécifique
GET  /api/songs/stats      // Statistiques
```

## 🚀 Utilisation Pratique

### **Initialisation**
```bash
# Installation des dépendances
npm install better-sqlite3 @types/better-sqlite3

# Initialisation de la base
npm run init-db
```

### **Import via API**
```bash
curl -X POST http://localhost:3000/api/songs/import \
  -F "file=@chants.txt" \
  -F "autoDetectCategory=true"
```

### **Recherche**
```bash
# Recherche par titre
curl "http://localhost:3000/api/songs/search?q=kyrie"

# Recherche full-text
curl "http://localhost:3000/api/songs/search?q=alléluia&type=fulltext"
```

## 📈 Performance et Scalabilité

### **Benchmarks Attendus**
- **Insertion** : 1000+ chants/seconde
- **Recherche titre** : < 10ms pour 10k chants
- **Full-text search** : < 50ms pour 10k chants
- **Taille DB** : ~1MB pour 1000 chants

### **Optimisations Implémentées**
- **WAL Mode** : Lectures concurrentes
- **Index composites** : Requêtes multi-critères
- **Prepared statements** : Sécurité et performance
- **Connection pooling** : Réutilisation des connexions

## 🛡️ Gestion d'Erreurs et Sécurité

### **Validation des Données**
- Titre et paroles obligatoires
- Longueur maximale des champs
- Catégories prédéfinies
- Encoding UTF-8 forcé

### **Détection de Doublons**
```typescript
// Hash SHA-256 des paroles normalisées
const hash = generateLyricsHash(lyrics);
const isDuplicate = db.isDuplicate(hash);
```

### **Transactions ACID**
```typescript
const transaction = db.transaction(() => {
    for (const song of songs) {
        db.createSong(song);
    }
});
transaction(); // Tout ou rien
```

## 📊 Monitoring et Maintenance

### **Statistiques Intégrées**
```typescript
const stats = db.getStatistics();
// {
//   totalSongs: 1250,
//   songsByCategory: { kyrie: 45, gloria: 67, ... },
//   recentImports: 23,
//   databaseSize: "2.3MB"
// }
```

### **Sauvegarde Automatique**
```typescript
// Sauvegarde complète
db.backup('./backups/songs-backup.db');

// Export JSON
const exportData = db.exportToJSON();
```

## 🔮 Extensions Futures

### **Prêt pour :**
- 🌐 **Synchronisation cloud** (Supabase, Firebase)
- 👥 **Multi-utilisateurs** avec authentification
- 📱 **API GraphQL** pour applications mobiles
- 🔍 **Recherche sémantique** avec embeddings
- 🎵 **Analyse musicale** des mélodies
- 📊 **Analytics** d'utilisation des chants

---

Cette architecture fournit une base solide et extensible pour la gestion de milliers de chants liturgiques avec des performances optimales et une facilité d'utilisation maximale ! 🎉