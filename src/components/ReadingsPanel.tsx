import React from 'react';
import { BookOpen, RefreshCw, AlertCircle } from 'lucide-react';
import { LiturgyReading } from '../types/liturgy';

interface ReadingsPanelProps {
  readings: LiturgyReading[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export default function ReadingsPanel({ readings, loading, error, onRefresh }: ReadingsPanelProps) {
  const getReadingTypeLabel = (type: string) => {
    const labels = {
      first_reading: 'Première lecture',
      psalm: 'Psaume responsorial',
      second_reading: 'Deuxième lecture',
      gospel: 'Évangile'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getReadingColor = (type: string) => {
    const colors = {
      first_reading: 'bg-green-50 border-green-200',
      psalm: 'bg-purple-50 border-purple-200',
      second_reading: 'bg-blue-50 border-blue-200',
      gospel: 'bg-amber-50 border-amber-200'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-blue-700" />
          <h2 className="text-xl font-semibold text-gray-800">Textes liturgiques</h2>
        </div>
        
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Chargement des textes...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-medium text-red-800">Erreur de chargement</h3>
          </div>
          <p className="text-red-700 text-sm mb-3">{error}</p>
          <button
            onClick={onRefresh}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {readings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aucun texte liturgique disponible pour cette date.
            </p>
          ) : (
            readings.map((reading) => (
              <div
                key={reading.id}
                className={`border rounded-lg p-4 ${getReadingColor(reading.type)}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-800">
                    {getReadingTypeLabel(reading.type)}
                  </h3>
                  <span className="text-sm text-gray-600 font-medium">
                    {reading.reference}
                  </span>
                </div>
                
                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                  {reading.text}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}