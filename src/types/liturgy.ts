export interface LiturgyReading {
  id: string;
  title: string;
  reference: string;
  text: string;
  type: 'first_reading' | 'psalm' | 'second_reading' | 'gospel';
}

export interface Song {
  id: string;
  title: string;
  lyrics: string;
  author?: string;
  melody?: string;
  category: 'entrance' | 'kyrie' | 'gloria' | 'offertory' | 'sanctus' | 'communion' | 'final' | 'other';
  order: number;
}

export interface LiturgyPresentation {
  id: string;
  title: string;
  date: string;
  readings: LiturgyReading[];
  songs: Song[];
  slideOrder: SlideItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SlideItem {
  id: string;
  type: 'reading' | 'song';
  order: number;
}

export interface AELFResponse {
  date?: string;
  date: string;
  readings: {
    first_reading?: LiturgyReading;
    psalm?: LiturgyReading;
    second_reading?: LiturgyReading;
    gospel?: LiturgyReading;
  };
  error?: string;
}