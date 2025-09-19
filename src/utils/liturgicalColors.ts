export interface LiturgicalSeason {
  name: string;
  color: string;
  textColor: string;
  backgroundColor: string;
}

export const liturgicalSeasons: Record<string, LiturgicalSeason> = {
  advent: {
    name: 'Avent',
    color: '#6B46C1', // Violet
    textColor: '6B46C1',
    backgroundColor: 'F3F4F6'
  },
  christmas: {
    name: 'Temps de Noël',
    color: '#FFFFFF', // Blanc
    textColor: '1F2937',
    backgroundColor: 'FFFFFF'
  },
  ordinary: {
    name: 'Temps ordinaire',
    color: '#059669', // Vert
    textColor: '059669',
    backgroundColor: 'F9FAFB'
  },
  lent: {
    name: 'Carême',
    color: '#6B46C1', // Violet
    textColor: '6B46C1',
    backgroundColor: 'F3F4F6'
  },
  holyWeek: {
    name: 'Semaine sainte',
    color: '#DC2626', // Rouge
    textColor: 'DC2626',
    backgroundColor: 'FEF2F2'
  },
  easter: {
    name: 'Temps pascal',
    color: '#FFFFFF', // Blanc
    textColor: '1F2937',
    backgroundColor: 'FFFFFF'
  },
  pentecost: {
    name: 'Pentecôte',
    color: '#DC2626', // Rouge
    textColor: 'DC2626',
    backgroundColor: 'FEF2F2'
  }
};

export function getLiturgicalSeason(date: Date): LiturgicalSeason {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const day = date.getDate();

  // Calcul approximatif des temps liturgiques
  // Note: Pour une application de production, il faudrait une logique plus précise
  
  // Avent (approximatif: 4 dimanches avant Noël)
  if ((month === 11 && day >= 27) || (month === 12 && day <= 24)) {
    return liturgicalSeasons.advent;
  }
  
  // Temps de Noël (25 décembre au dimanche après l'Épiphanie)
  if ((month === 12 && day >= 25) || (month === 1 && day <= 13)) {
    return liturgicalSeasons.christmas;
  }
  
  // Carême (approximatif: 40 jours avant Pâques)
  // Pâques varie entre le 22 mars et le 25 avril
  const easter = getEasterDate(year);
  const lentStart = new Date(easter);
  lentStart.setDate(easter.getDate() - 46); // Mercredi des Cendres
  
  const holyWeekStart = new Date(easter);
  holyWeekStart.setDate(easter.getDate() - 7); // Dimanche des Rameaux
  
  if (date >= lentStart && date < holyWeekStart) {
    return liturgicalSeasons.lent;
  }
  
  // Semaine sainte
  if (date >= holyWeekStart && date < easter) {
    return liturgicalSeasons.holyWeek;
  }
  
  // Temps pascal (50 jours après Pâques)
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);
  
  if (date >= easter && date <= pentecost) {
    return liturgicalSeasons.easter;
  }
  
  // Pentecôte
  if (date.getTime() === pentecost.getTime()) {
    return liturgicalSeasons.pentecost;
  }
  
  // Temps ordinaire par défaut
  return liturgicalSeasons.ordinary;
}

// Calcul de la date de Pâques (algorithme de Gauss)
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}