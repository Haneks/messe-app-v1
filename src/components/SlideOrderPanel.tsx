import React from 'react';
import { GripVertical, ChevronUp, ChevronDown, BookOpen, Music } from 'lucide-react';
import { LiturgyReading, Song, SlideItem } from '../types/liturgy';

interface SlideOrderPanelProps {
  readings: LiturgyReading[];
  songs: Song[];
  slideOrder: SlideItem[];
  onReorderSlide: (slideId: string, direction: 'up' | 'down') => void;
}

export default function SlideOrderPanel({ readings, songs, slideOrder, onReorderSlide }: SlideOrderPanelProps) {
  const getSlideContent = (slideItem: SlideItem) => {
    if (slideItem.type === 'reading') {
      const reading = readings.find(r => r.id === slideItem.id);
      return reading ? {
        title: reading.title,
        subtitle: reading.reference,
        icon: BookOpen,
        color: 'text-green-600 bg-green-50'
      } : null;
    } else {
      const song = songs.find(s => s.id === slideItem.id);
      return song ? {
        title: song.title,
        subtitle: song.category,
        icon: Music,
        color: 'text-amber-600 bg-amber-50'
      } : null;
    }
  };

  const sortedSlides = [...slideOrder].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <GripVertical className="w-6 h-6 text-blue-700" />
        <h2 className="text-xl font-semibold text-gray-800">Ordre des slides</h2>
      </div>

      {sortedSlides.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Aucune slide dans la présentation</p>
          <p className="text-sm mt-2">Ajoutez des chants ou sélectionnez une date pour voir les lectures</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedSlides.map((slideItem, index) => {
            const content = getSlideContent(slideItem);
            if (!content) return null;

            const Icon = content.icon;

            return (
              <div key={slideItem.id} className={`flex items-center gap-3 p-3 rounded-lg border ${content.color} border-opacity-50`}>
                <div className="flex items-center gap-3 flex-1">
                  <span className="bg-blue-600 text-white text-sm font-bold px-2 py-1 rounded min-w-[2rem] text-center">
                    {index + 1}
                  </span>
                  <Icon className="w-5 h-5" />
                  <div>
                    <div className="font-medium text-gray-800">{content.title}</div>
                    <div className="text-sm text-gray-600">{content.subtitle}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onReorderSlide(slideItem.id, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Monter"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onReorderSlide(slideItem.id, 'down')}
                    disabled={index === sortedSlides.length - 1}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Descendre"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-blue-800 text-sm">
          💡 <strong>Conseil :</strong> Vous pouvez réorganiser l'ordre des slides pour placer les chants entre les lectures selon vos besoins liturgiques.
        </p>
      </div>
    </div>
  );
}