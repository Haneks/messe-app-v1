import React, { useState, useEffect } from 'react';
import { Church } from 'lucide-react';
import DateSelector from './components/DateSelector';
import ReadingsPanel from './components/ReadingsPanel';
import SongsPanel from './components/SongsPanel';
import SlideOrderPanel from './components/SlideOrderPanel';
import PreviewPanel from './components/PreviewPanel';
import { AELFService } from './services/aelf';
import { LiturgyReading, Song, LiturgyPresentation, SlideItem } from './types/liturgy';
import { format } from 'date-fns';

function App() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [readings, setReadings] = useState<LiturgyReading[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [slideOrder, setSlideOrder] = useState<SlideItem[]>([]);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [readingsError, setReadingsError] = useState<string | null>(null);

  // État de la présentation
  const [presentation, setPresentation] = useState<LiturgyPresentation | null>(null);

  // Chargement des textes liturgiques
  const loadReadings = async () => {
    setLoadingReadings(true);
    setReadingsError(null);
    try {
      const serviceResponse = await AELFService.getReadingsForDate(selectedDate);
      const readingsArray = Object.values(serviceResponse.readings).filter(reading => reading) as LiturgyReading[];
      setReadings(readingsArray);
      
      // Définir l'erreur si l'API a échoué mais que nous avons des données de fallback
      if (serviceResponse.error) {
        setReadingsError(serviceResponse.error);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des textes:', error);
      setReadingsError(error instanceof Error ? error.message : 'Erreur inconnue lors du chargement des textes liturgiques');
      setReadings([]);
    } finally {
      setLoadingReadings(false);
    }
  };

  // Chargement initial et lors du changement de date
  useEffect(() => {
    loadReadings();
  }, [selectedDate]);

  // Mise à jour de la présentation
  useEffect(() => {
    if (readings.length > 0 || songs.length > 0 || slideOrder.length > 0) {
      setPresentation({
        id: 'current-presentation',
        title: `Messe du ${new Date(selectedDate).toLocaleDateString('fr-FR')}`,
        date: selectedDate,
        readings,
        songs,
        slideOrder,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      setPresentation(null);
    }
  }, [selectedDate, readings, songs, slideOrder]);

  // Mise à jour de l'ordre des slides quand les lectures ou chants changent
  useEffect(() => {
    const newSlideOrder: SlideItem[] = [];
    let orderCounter = 0;

    // Ajouter les nouvelles lectures qui ne sont pas déjà dans l'ordre
    readings.forEach(reading => {
      if (!slideOrder.find(item => item.id === reading.id)) {
        newSlideOrder.push({
          id: reading.id,
          type: 'reading',
          order: orderCounter++
        });
      }
    });

    // Ajouter les nouveaux chants qui ne sont pas déjà dans l'ordre
    songs.forEach(song => {
      if (!slideOrder.find(item => item.id === song.id)) {
        newSlideOrder.push({
          id: song.id,
          type: 'song',
          order: orderCounter++
        });
      }
    });

    // Conserver l'ordre existant et ajouter les nouveaux éléments
    const existingValidItems = slideOrder.filter(item => {
      if (item.type === 'reading') {
        return readings.find(r => r.id === item.id);
      } else {
        return songs.find(s => s.id === item.id);
      }
    });

    const finalOrder = [...existingValidItems, ...newSlideOrder];
    
    // Réorganiser les numéros d'ordre
    finalOrder.forEach((item, index) => {
      item.order = index;
    });

    setSlideOrder(finalOrder);
  }, [readings, songs]);

  // Gestion des chants
  const handleAddSong = (songData: Omit<Song, 'id'>) => {
    const maxOrder = songs.length > 0 ? Math.max(...songs.map(s => s.order)) : -1;
    const newSong: Song = {
      ...songData,
      id: `song-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order: maxOrder + 1
    };
    setSongs([...songs, newSong]);
  };

  const handleUpdateSong = (id: string, songData: Omit<Song, 'id'>) => {
    setSongs(songs.map(song => song.id === id ? { ...songData, id, order: song.order } : song));
  };

  const handleDeleteSong = (id: string) => {
    setSongs(songs.filter(song => song.id !== id));
  };

  const handleReorderSong = (id: string, direction: 'up' | 'down') => {
    const songIndex = songs.findIndex(song => song.id === id);
    if (songIndex === -1) return;

    const sortedSongs = [...songs].sort((a, b) => a.order - b.order);
    const sortedIndex = sortedSongs.findIndex(song => song.id === id);
    
    if (direction === 'up' && sortedIndex > 0) {
      const currentSong = sortedSongs[sortedIndex];
      const previousSong = sortedSongs[sortedIndex - 1];
      
      // Échanger les ordres
      const tempOrder = currentSong.order;
      currentSong.order = previousSong.order;
      previousSong.order = tempOrder;
      
      setSongs([...songs]);
    } else if (direction === 'down' && sortedIndex < sortedSongs.length - 1) {
      const currentSong = sortedSongs[sortedIndex];
      const nextSong = sortedSongs[sortedIndex + 1];
      
      // Échanger les ordres
      const tempOrder = currentSong.order;
      currentSong.order = nextSong.order;
      nextSong.order = tempOrder;
      
      setSongs([...songs]);
    }
  };

  // Gestion de l'ordre des slides
  const handleReorderSlide = (slideId: string, direction: 'up' | 'down') => {
    const slideIndex = slideOrder.findIndex(item => item.id === slideId);
    if (slideIndex === -1) return;

    const sortedSlides = [...slideOrder].sort((a, b) => a.order - b.order);
    const sortedIndex = sortedSlides.findIndex(item => item.id === slideId);
    
    if (direction === 'up' && sortedIndex > 0) {
      const currentSlide = sortedSlides[sortedIndex];
      const previousSlide = sortedSlides[sortedIndex - 1];
      
      // Échanger les ordres
      const tempOrder = currentSlide.order;
      currentSlide.order = previousSlide.order;
      previousSlide.order = tempOrder;
      
      setSlideOrder([...slideOrder]);
    } else if (direction === 'down' && sortedIndex < sortedSlides.length - 1) {
      const currentSlide = sortedSlides[sortedIndex];
      const nextSlide = sortedSlides[sortedIndex + 1];
      
      // Échanger les ordres
      const tempOrder = currentSlide.order;
      currentSlide.order = nextSlide.order;
      nextSlide.order = tempOrder;
      
      setSlideOrder([...slideOrder]);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-amber-50">
      <div className="container mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-700 rounded-full">
              <Church className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Créateur de Présentations Liturgiques
              </h1>
              <p className="text-gray-600 mt-1">
                Créez facilement des présentations pour vos célébrations avec les textes de l'AELF
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne gauche : Édition */}
          <div className="space-y-6">
            <DateSelector 
              selectedDate={selectedDate} 
              onDateChange={setSelectedDate} 
            />
            
            <ReadingsPanel 
              readings={readings} 
              loading={loadingReadings}
              error={readingsError}
              onRefresh={loadReadings}
            />
            
            <SongsPanel 
              songs={songs}
              onAddSong={handleAddSong}
              onUpdateSong={handleUpdateSong}
              onDeleteSong={handleDeleteSong}
              onReorderSong={handleReorderSong}
            />
            
            <SlideOrderPanel 
              readings={readings}
              songs={songs}
              slideOrder={slideOrder}
              onReorderSlide={handleReorderSlide}
            />
          </div>

          {/* Colonne droite : Aperçu */}
          <div className="lg:sticky lg:top-8 h-fit">
            <PreviewPanel presentation={presentation} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>
            Application créée pour faciliter la préparation des présentations liturgiques
          </p>
          <p className="mt-1">
            Textes liturgiques basés sur l'AELF (Association Épiscopale Liturgique pour les pays Francophones)
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;