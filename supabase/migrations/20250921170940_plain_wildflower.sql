-- =====================================================
-- SCHÉMA DE BASE DE DONNÉES POUR GESTION DE CHANTS
-- =====================================================
-- Base de données SQLite pour stockage local persistant
-- Optimisée pour plusieurs milliers de chants

-- Table principale des chants
CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    normalized_title VARCHAR(255) NOT NULL, -- Pour recherche insensible à la casse
    lyrics TEXT NOT NULL,
    lyrics_hash VARCHAR(64) NOT NULL, -- Hash SHA-256 pour détection doublons
    author VARCHAR(255),
    melody VARCHAR(255),
    category VARCHAR(50) DEFAULT 'other',
    language VARCHAR(10) DEFAULT 'fr',
    source_file VARCHAR(500), -- Nom du fichier d'origine
    import_method VARCHAR(20) DEFAULT 'manual', -- 'manual', 'txt_import', 'docx_import'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    
    -- Contraintes
    CONSTRAINT chk_category CHECK (category IN ('entrance', 'kyrie', 'gloria', 'offertory', 'sanctus', 'communion', 'final', 'other')),
    CONSTRAINT chk_import_method CHECK (import_method IN ('manual', 'txt_import', 'docx_import', 'api_import'))
);

-- Table des métadonnées étendues
CREATE TABLE IF NOT EXISTS song_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    metadata_key VARCHAR(100) NOT NULL,
    metadata_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    UNIQUE(song_id, metadata_key)
);

-- Table des tags/étiquettes pour classification avancée
CREATE TABLE IF NOT EXISTS song_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    tag VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    UNIQUE(song_id, tag)
);

-- Table d'historique des modifications
CREATE TABLE IF NOT EXISTS song_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'created', 'updated', 'deleted'
    old_data TEXT, -- JSON des anciennes données
    new_data TEXT, -- JSON des nouvelles données
    changed_by VARCHAR(100) DEFAULT 'system',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    CONSTRAINT chk_action CHECK (action IN ('created', 'updated', 'deleted'))
);

-- Table des imports (traçabilité)
CREATE TABLE IF NOT EXISTS import_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(36) NOT NULL UNIQUE, -- UUID
    file_name VARCHAR(500),
    file_size INTEGER,
    file_type VARCHAR(20),
    total_songs INTEGER DEFAULT 0,
    successful_imports INTEGER DEFAULT 0,
    failed_imports INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    
    CONSTRAINT chk_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- =====================================================
-- INDEX POUR OPTIMISATION DES PERFORMANCES
-- =====================================================

-- Index pour recherche rapide par titre
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_songs_normalized_title ON songs(normalized_title);

-- Index pour recherche par catégorie
CREATE INDEX IF NOT EXISTS idx_songs_category ON songs(category);

-- Index pour recherche par auteur
CREATE INDEX IF NOT EXISTS idx_songs_author ON songs(author);

-- Index pour détection de doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_songs_lyrics_hash ON songs(lyrics_hash);

-- Index pour recherche full-text (SQLite FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts USING fts5(
    title, 
    lyrics, 
    author, 
    content='songs', 
    content_rowid='id'
);

-- Triggers pour maintenir la table FTS5 synchronisée
CREATE TRIGGER IF NOT EXISTS songs_fts_insert AFTER INSERT ON songs BEGIN
    INSERT INTO songs_fts(rowid, title, lyrics, author) 
    VALUES (new.id, new.title, new.lyrics, new.author);
END;

CREATE TRIGGER IF NOT EXISTS songs_fts_delete AFTER DELETE ON songs BEGIN
    INSERT INTO songs_fts(songs_fts, rowid, title, lyrics, author) 
    VALUES('delete', old.id, old.title, old.lyrics, old.author);
END;

CREATE TRIGGER IF NOT EXISTS songs_fts_update AFTER UPDATE ON songs BEGIN
    INSERT INTO songs_fts(songs_fts, rowid, title, lyrics, author) 
    VALUES('delete', old.id, old.title, old.lyrics, old.author);
    INSERT INTO songs_fts(rowid, title, lyrics, author) 
    VALUES (new.id, new.title, new.lyrics, new.author);
END;

-- Trigger pour mise à jour automatique de updated_at
CREATE TRIGGER IF NOT EXISTS songs_updated_at AFTER UPDATE ON songs BEGIN
    UPDATE songs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =====================================================
-- VUES POUR FACILITER LES REQUÊTES
-- =====================================================

-- Vue complète des chants avec métadonnées
CREATE VIEW IF NOT EXISTS songs_complete AS
SELECT 
    s.*,
    GROUP_CONCAT(DISTINCT st.tag) as tags,
    COUNT(DISTINCT st.id) as tag_count
FROM songs s
LEFT JOIN song_tags st ON s.id = st.song_id
WHERE s.is_active = 1
GROUP BY s.id;

-- Vue des statistiques d'import
CREATE VIEW IF NOT EXISTS import_stats AS
SELECT 
    DATE(started_at) as import_date,
    COUNT(*) as total_sessions,
    SUM(successful_imports) as total_successful,
    SUM(failed_imports) as total_failed,
    AVG(total_songs) as avg_songs_per_session
FROM import_sessions
GROUP BY DATE(started_at)
ORDER BY import_date DESC;

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Insertion de quelques chants par défaut
INSERT OR IGNORE INTO songs (title, normalized_title, lyrics, lyrics_hash, category, import_method) VALUES
('Kyrie Eleison', 'kyrie eleison', 'Kyrie eleison, Kyrie eleison, Kyrie eleison.

Christe eleison, Christe eleison, Christe eleison.

Kyrie eleison, Kyrie eleison, Kyrie eleison.', 
'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6', 'kyrie', 'manual'),

('Gloria in Excelsis', 'gloria in excelsis', 'Gloire à Dieu au plus haut des cieux,
Et paix sur la terre aux hommes qu''il aime.
Nous te louons, nous te bénissons,
Nous t''adorons, nous te glorifions.',
'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1', 'gloria', 'manual');