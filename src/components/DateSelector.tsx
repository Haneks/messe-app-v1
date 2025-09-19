import React from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getLiturgicalSeason } from '../utils/liturgicalColors';

interface DateSelectorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export default function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'EEEE dd MMMM yyyy', { locale: fr });
  };

  const liturgicalSeason = getLiturgicalSeason(new Date(selectedDate));

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="w-6 h-6 text-blue-700" />
        <h2 className="text-xl font-semibold text-gray-800">Sélection de la date</h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="liturgy-date" className="block text-sm font-medium text-gray-700 mb-2">
            Date de la célébration
          </label>
          <input
            type="date"
            id="liturgy-date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-blue-800 font-medium">
            Célébration du {formatDateForDisplay(selectedDate)}
          </p>
          <p className="text-sm text-blue-600 mt-1">
            Temps liturgique : <span className="font-medium" style={{ color: liturgicalSeason.color }}>
              {liturgicalSeason.name}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}