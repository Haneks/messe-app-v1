import { LiturgyReading, AELFResponse } from '../types/liturgy';

// Interface pour la réponse complète de l'API AELF
interface AELFApiResponse {
  informations: {
    date: string;
    zone: string;
    couleur: string;
    temps_liturgique: string;
    semaine: string;
    jour: string;
  };
  messes: Array<{
    nom: string;
    lectures: Array<{
      type: string;
      titre: string;
      contenu: string;
      ref: string;
      intro_lue: string;
    }>;
  }>;
}

// Service pour récupérer les textes liturgiques de l'AELF
export class AELFService {
  private static readonly BASE_URL = '/api/aelf';
  private static readonly ZONE = 'france';

  static async getReadingsForDate(date: string): Promise<AELFResponse> {
    try {
      // Format de date pour l'API AELF (YYYY-MM-DD)
      const formattedDate = date; // La date est déjà au bon format
      const url = `${this.BASE_URL}/v1/messes/${formattedDate}/${this.ZONE}`;
      
      console.log('Appel API AELF:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; LiturgyApp/1.0)',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        // Ajouter un timeout
        signal: AbortSignal.timeout(30000), // 30 secondes
      });

      if (!response.ok) {
        const errorMessage = `Erreur API AELF (${response.status}): ${response.statusText}`;
        console.warn(errorMessage);
        
        // Essayer une approche alternative pour certaines erreurs
        if (response.status === 502 || response.status === 503) {
          console.log('Tentative avec une approche alternative...');
          return this.tryAlternativeApproach(date);
        }
        
        return this.getMockReadings(date, errorMessage);
      }

      // Vérifier le Content-Type avant de parser le JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.warn('Réponse non-JSON reçue:', textResponse.substring(0, 200));
        
        // Si c'est du HTML, c'est probablement une page d'erreur
        if (textResponse.trim().startsWith('<!')) {
          console.warn('Page HTML reçue au lieu de JSON, probablement une erreur serveur');
          return this.getMockReadings(date, 'L\'API AELF a retourné une page d\'erreur au lieu des données JSON');
        }
        
        return this.getMockReadings(date, 'Format de réponse invalide de l\'API AELF');
      }
      
      let data: AELFApiResponse;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Erreur de parsing JSON:', jsonError);
        return this.getMockReadings(date, 'Erreur de format dans la réponse de l\'API AELF');
      }
      
      console.log('Réponse API AELF:', data);
      
      return this.parseAELFResponse(data, date);
    } catch (error) {
      console.error('Erreur lors de la récupération des textes AELF:', error);
      
      // Si c'est une erreur de timeout ou de réseau, essayer l'approche alternative
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('fetch'))) {
        console.log('Tentative avec approche alternative après erreur réseau...');
        return this.tryAlternativeApproach(date);
      }
      
      // Fallback vers les données simulées en cas d'erreur
      return this.getMockReadings(date, error instanceof Error ? error.message : 'Erreur inconnue lors du chargement des textes liturgiques');
    }
  }

  private static async tryAlternativeApproach(date: string): Promise<AELFResponse> {
    try {
      // Essayer d'accéder directement à l'API sans proxy
      const directUrl = `https://api.aelf.org/v1/messes/${date}/${this.ZONE}`;
      console.log('Tentative d\'accès direct:', directUrl);
      
      const response = await fetch(directUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; LiturgyApp/1.0)',
        },
        mode: 'cors',
        signal: AbortSignal.timeout(15000), // 15 secondes
      });

      if (response.ok) {
        // Vérifier le Content-Type
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const responseText = await response.text();
            const data: AELFApiResponse = JSON.parse(responseText);
            console.log('Succès avec l\'approche alternative');
            return this.parseAELFResponse(data, date);
          } catch (jsonError) {
            console.log('Erreur JSON avec approche alternative:', jsonError);
          }
        } else {
          console.log('Réponse non-JSON avec approche alternative');
        }
      }
    } catch (error) {
      console.log('Approche alternative échouée:', error);
    }
    
    // Si tout échoue, retourner les données simulées
    return this.getMockReadings(date, 'Impossible de contacter l\'API AELF. Utilisation des données d\'exemple.');
  }
  private static parseAELFResponse(data: AELFApiResponse, date: string): AELFResponse {
    const readings: AELFResponse['readings'] = {};

    try {
      // Vérifier que nous avons des messes
      if (!data.messes || data.messes.length === 0) {
        console.warn('Aucune messe trouvée dans la réponse AELF');
        return this.getMockReadings(date, 'Aucune messe trouvée pour cette date');
      }

      // Prendre la première messe (généralement la messe principale)
      const messe = data.messes[0];
      
      if (!messe.lectures || messe.lectures.length === 0) {
        console.warn('Aucune lecture trouvée dans la messe');
        return this.getMockReadings(date, 'Aucune lecture trouvée pour cette messe');
      }

      // Parser chaque lecture
      messe.lectures.forEach((lecture, index) => {
        const readingId = `${lecture.type}-${date}-${index}`;
        const cleanedText = this.cleanText(lecture.contenu);
        
        // Mapper les types de lectures
        switch (lecture.type.toLowerCase()) {
          case 'premiere_lecture':
          case 'première_lecture':
          case 'lecture_1':
            readings.first_reading = {
              id: readingId,
              title: lecture.titre || 'Première lecture',
              reference: lecture.ref || '',
              text: cleanedText,
              type: 'first_reading'
            };
            break;
            
          case 'psaume':
          case 'psaume_responsorial':
            readings.psalm = {
              id: readingId,
              title: lecture.titre || 'Psaume responsorial',
              reference: lecture.ref || '',
              text: cleanedText,
              type: 'psalm'
            };
            break;
            
          case 'deuxieme_lecture':
          case 'deuxième_lecture':
          case 'lecture_2':
            readings.second_reading = {
              id: readingId,
              title: lecture.titre || 'Deuxième lecture',
              reference: lecture.ref || '',
              text: cleanedText,
              type: 'second_reading'
            };
            break;
            
          case 'evangile':
          case 'évangile':
            readings.gospel = {
              id: readingId,
              title: lecture.titre || 'Évangile',
              reference: lecture.ref || '',
              text: cleanedText,
              type: 'gospel'
            };
            break;
            
          default:
            console.log(`Type de lecture non reconnu: ${lecture.type}`);
        }
      });

      // Si aucune lecture n'a été trouvée, utiliser les données simulées
      if (Object.keys(readings).length === 0) {
        console.warn('Aucune lecture reconnue dans la réponse AELF, utilisation des données simulées');
        return this.getMockReadings(date, 'Types de lectures non reconnus dans la réponse API');
      }

    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse AELF:', parseError);
      return this.getMockReadings(date, 'Erreur lors du traitement de la réponse API');
    }

    return { readings };
  }

  private static cleanText(text: string): string {
    if (!text) return '';
    
    // Nettoyer le texte des balises HTML et caractères indésirables
    return text
      .replace(/<[^>]*>/g, '') // Supprimer les balises HTML
      .replace(/&nbsp;/g, ' ') // Remplacer les espaces insécables
      .replace(/&amp;/g, '&') // Remplacer les entités HTML
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/\s+/g, ' ') // Normaliser les espaces multiples
      .trim();
  }

  private static getMockReadings(date: string, error?: string): AELFResponse {
    return {
      readings: {
        first_reading: {
          id: 'first-' + date,
          title: 'Première lecture',
          reference: 'Is 55, 10-11',
          text: 'Ainsi parle le Seigneur : « La pluie et la neige qui descendent des cieux n\'y retournent pas sans avoir abreuvé la terre, sans l\'avoir fécondée et l\'avoir fait germer, donnant la semence au semeur et le pain à celui qui doit manger ; ainsi ma parole, qui sort de ma bouche, ne me reviendra pas sans résultat, sans avoir fait ce qui me plaît, sans avoir accompli sa mission. »',
          type: 'first_reading'
        },
        psalm: {
          id: 'psalm-' + date,
          title: 'Psaume responsorial',
          reference: 'Ps 64',
          text: 'Tu visites la terre et tu l\'abreuves, tu la combles de richesses ; les ruisseaux de Dieu regorgent d\'eau : tu prépares les moissons. Ainsi tu prépares la terre, tu arroses les sillons ; tu aplanis le sol, tu le détrempes sous les pluies, tu bénis les semailles.',
          type: 'psalm'
        },
        gospel: {
          id: 'gospel-' + date,
          title: 'Évangile',
          reference: 'Mt 13, 1-23',
          text: 'Ce jour-là, Jésus était sorti de la maison, et il était assis au bord de la mer. Auprès de lui se rassemblèrent des foules si grandes qu\'il monta dans une barque où il s\'assit ; toute la foule se tenait sur le rivage. Il leur dit beaucoup de choses en paraboles : « Voici que le semeur sortit pour semer. Comme il semait, des grains sont tombés au bord du chemin, et les oiseaux sont venus tout manger. »',
          type: 'gospel'
        }
      },
      error: error
    };
  }
}