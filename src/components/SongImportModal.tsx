import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Song } from '../types/liturgy';
import { useSongImport } from '../hooks/useSongImport';
import ImportProgressIndicator from './ImportProgressIndicator';

interface SongImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSong: (song: Omit<Song, 'id'>) => void;
  onSaveToLibrary?: (song: Omit<Song, 'id'>) => Promise<any>;
}

export default function SongImportModal({ isOpen, onClose, onImportSong, onSaveToLibrary }: SongImportModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { progress, importSongFromFile, resetProgress } = useSongImport();

  const categories = [
    { value: 'entrance', label: 'Entrée' },
    { value: 'kyrie', label: 'Kyrie' },
    { value: 'gloria', label: 'Gloria' },
    { value: 'offertory', label: 'Offertoire' },
    { value: 'sanctus', label: 'Sanctus' },
    { value: 'communion', label: 'Communion' },
    { value: 'final', label: 'Sortie' },
    { value: 'other', label: 'Autre' }
  ];

  const [importSettings, setImportSettings] = useState({
    category: 'other' as Song['category'],
    author: '',
    melody: '',
    autoDetectCategory: true
  });

  if (!isOpen) return null;

  /**
   * Handles file selection from input or drop
   */
  const handleFileSelection = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    resetProgress();

    const result = await importSongFromFile(file, {
      category: importSettings.autoDetectCategory ? undefined : importSettings.category,
      author: importSettings.author || undefined,
      melody: importSettings.melody || undefined,
      autoDetectCategory: importSettings.autoDetectCategory
    });

    if (result.success && result.song) {
      // Ajouter le chant à la présentation
      onImportSong(result.song);
      
      // Sauvegarder automatiquement dans la bibliothèque
      if (onSaveToLibrary) {
        try {
          await onSaveToLibrary(result.song);
          console.log(`✅ Chant importé "${result.song.title}" ajouté automatiquement à la bibliothèque`);
        } catch (error) {
          console.warn(`⚠️ Impossible d'ajouter "${result.song.title}" à la bibliothèque:`, error);
        }
      }
      
      // Fermer le modal après un court délai pour montrer le message de succès
      setTimeout(() => {
        handleClose();
      }, 1500);
    }
  };

  /**
   * Handles drag and drop events
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelection(e.dataTransfer.files);
  };

  /**
   * Handles file input change
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(e.target.files);
  };

  /**
   * Opens file selection dialog
   */
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  /**
   * Closes modal and resets state
   */
  const handleClose = () => {
    resetProgress();
    setDragOver(false);
    setImportSettings({
      category: 'other',
      author: '',
      melody: '',
      autoDetectCategory: true
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Importer des paroles</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Import Settings */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                value={importSettings.category}
                onChange={(e) => setImportSettings({
                  ...importSettings,
                  category: e.target.value as Song['category']
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={importSettings.autoDetectCategory}
                  onChange={(e) => setImportSettings({
                    ...importSettings,
                    autoDetectCategory: e.target.checked
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Détecter automatiquement la catégorie
                </span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auteur (optionnel)
                </label>
                <input
                  type="text"
                  value={importSettings.author}
                  onChange={(e) => setImportSettings({
                    ...importSettings,
                    author: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom de l'auteur"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mélodie (optionnel)
                </label>
                <input
                  type="text"
                  value={importSettings.melody}
                  onChange={(e) => setImportSettings({
                    ...importSettings,
                    melody: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom de la mélodie"
                />
              </div>
            </div>
          </div>

          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {progress.stage !== 'idle' && progress.stage !== 'complete' && progress.stage !== 'error' ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                <p className="text-gray-600">Import en cours...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-gray-600 mb-2">
                  Glissez un fichier .txt ici ou
                </p>
                <button
                  onClick={openFileDialog}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Sélectionner un fichier
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Formats supportés : .txt, .docx (UTF-8 recommandé pour .txt)
                </p>
              </div>
            )}
          </div>

          {/* Import Progress */}
          <ImportProgressIndicator progress={progress} />

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 mb-1">
                  Format recommandé
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Fichier texte (.txt) encodé en UTF-8 ou Word (.docx)</li>
                  <li>• Titre du chant sur la première ligne (optionnel)</li>
                  <li>• Paroles organisées en couplets et refrains</li>
                  <li>• Utilisez "R/" pour marquer les refrains</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.text,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
}