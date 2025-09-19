import React from 'react';
import { Eye, Download } from 'lucide-react';
import { LiturgyPresentation, SlideItem } from '../types/liturgy';
import { PowerPointService } from '../services/powerpoint';

interface PreviewPanelProps {
  presentation: LiturgyPresentation | null;
}

export default function PreviewPanel({ presentation }: PreviewPanelProps) {
  const [exporting, setExporting] = React.useState(false);

  const handleExport = async () => {
    if (!presentation) return;
    
    setExporting(true);
    try {
      await PowerPointService.exportPresentation(presentation);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export PowerPoint');
    } finally {
      setExporting(false);
    }
  };


  if (!presentation) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Eye className="w-6 h-6 text-blue-700" />
          <h2 className="text-xl font-semibold text-gray-800">Aperçu</h2>
        </div>
        
        <div className="text-center py-12 text-gray-500">
          <Eye className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>L'aperçu de votre présentation apparaîtra ici</p>
        </div>
      </div>
    );
  }

  // Calculer le nombre total de slides (titre + slides ordonnées)
  const totalSlides = 1 + presentation.slideOrder.length;

  const getSlideInfo = (slideItem: SlideItem, index: number) => {
    if (slideItem.type === 'reading') {
      const reading = presentation.readings.find(r => r.id === slideItem.id);
      return reading ? {
        title: reading.title,
        color: 'bg-green-600'
      } : null;
    } else {
      const song = presentation.songs.find(s => s.id === slideItem.id);
      return song ? {
        title: song.title,
        color: 'bg-amber-600'
      } : null;
    }
  };

  // Trier les slides par ordre
  const sortedSlides = [...presentation.slideOrder].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Eye className="w-6 h-6 text-blue-700" />
          <h2 className="text-xl font-semibold text-gray-800">Aperçu</h2>
        </div>
        
        <div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Export...' : 'Exporter PowerPoint'}
          </button>
        </div>
      </div>


      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">{presentation.title}</h3>
          <p className="text-blue-700 text-sm">
            {new Date(presentation.date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p className="text-blue-600 text-sm mt-2">
            {totalSlides} diapositive{totalSlides > 1 ? 's' : ''}
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-800">Contenu de la présentation :</h4>
          
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-6 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <span className="text-gray-700">Page de titre</span>
            </div>

            {sortedSlides.map((slideItem, index) => {
              const slideInfo = getSlideInfo(slideItem, index);
              if (!slideInfo) return null;

              return (
                <div key={slideItem.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-6 ${slideInfo.color} rounded flex items-center justify-center`}>
                    <span className="text-white text-xs font-bold">{index + 2}</span>
                  </div>
                  <span className="text-gray-700">{slideInfo.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {sortedSlides.length > 0 && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-green-800 text-sm">
              ✓ Présentation prête à être exportée en PowerPoint
            </p>
          </div>
        )}
      </div>
    </div>
  );
}