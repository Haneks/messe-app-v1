import PptxGenJS from 'pptxgenjs';
import { LiturgyPresentation, LiturgyReading, Song, SlideItem } from '../types/liturgy';
import { getLiturgicalSeason } from '../utils/liturgicalColors';

export class PowerPointService {
  private static readonly TARGET_WORDS_PER_SLIDE = 85; // Target 80-90 words
  private static readonly MIN_WORDS_PER_SLIDE = 80;
  private static readonly MAX_WORDS_PER_SLIDE = 90;

  static async exportPresentation(presentation: LiturgyPresentation): Promise<void> {
    const pptx = new PptxGenJS();
    
    // Déterminer les couleurs liturgiques selon la date
    const liturgicalSeason = getLiturgicalSeason(new Date(presentation.date));
    
    // Configuration de base
    pptx.author = 'Application Liturgique';
    pptx.title = presentation.title;
    pptx.subject = 'Présentation pour la messe';
    
    // Métadonnées pour l'intégration d'images
    pptx.company = 'Liturgy App';
    pptx.category = 'Religious Presentation';

    let slideNumber = 1;

    // Créer la slide de titre (avec ou sans image)
    slideNumber += this.createTitleSlide(pptx, presentation, slideNumber);

    // Slides dans l'ordre défini par l'utilisateur
    const sortedSlides = [...presentation.slideOrder].sort((a, b) => a.order - b.order);
    
    for (const slideItem of sortedSlides) {
      if (slideItem.type === 'reading') {
        const reading = presentation.readings.find(r => r.id === slideItem.id);
        if (reading) {
          const readingSlides = this.createOptimizedReadingSlides(
            pptx, 
            reading, 
            liturgicalSeason, 
            slideNumber
          );
          slideNumber += readingSlides;
        }
      } else if (slideItem.type === 'song') {
        const song = presentation.songs.find(s => s.id === slideItem.id);
        if (song) {
          const songSlides = this.createOptimizedSongSlides(
            pptx, 
            song, 
            liturgicalSeason, 
            slideNumber
          );
          slideNumber += songSlides;
        }
      }
    }

    // Télécharger le fichier
    const fileName = `${presentation.title}.pptx`;
    await pptx.writeFile({ fileName });
    
    // Log pour le débogage
    console.log(`📄 PowerPoint exporté: ${fileName}`);
    console.log(`📊 ${slideNumber - 1} slides créées`);
  }

  private static createTitleSlide(
    pptx: PptxGenJS, 
    presentation: LiturgyPresentation, 
    slideNumber: number
  ): number {
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: '1E40AF' };
    
    titleSlide.addText(presentation.title, {
      x: 0.5,
      y: 2,
      w: 9,
      h: 1.5,
      fontSize: 44,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
      bold: true
    });

    titleSlide.addText(new Date(presentation.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }), {
      x: 0.5,
      y: 4,
      w: 9,
      h: 1,
      fontSize: 24,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial'
    });

    // Numéro de slide
    titleSlide.addText(`${slideNumber}`, {
      x: 9.2,
      y: 7,
      w: 0.5,
      h: 0.3,
      fontSize: 12,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial'
    });

    return 1;
  }

  private static createOptimizedReadingSlides(
    pptx: PptxGenJS, 
    reading: LiturgyReading, 
    liturgicalSeason: any, 
    startSlideNumber: number
  ): number {
    let slideCount = 0;

    // Slide de titre pour la lecture
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: 'F8FAFC' };

    titleSlide.addText(reading.title, {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1.2,
      fontSize: 36,
      color: '1E40AF',
      bold: true,
      align: 'center',
      fontFace: 'Arial'
    });

    titleSlide.addText(reading.reference, {
      x: 0.5,
      y: 4,
      w: 9,
      h: 0.8,
      fontSize: 24,
      color: '64748B',
      italic: true,
      align: 'center',
      fontFace: 'Arial'
    });

    // Numéro de slide
    titleSlide.addText(`${startSlideNumber + slideCount}`, {
      x: 9.2,
      y: 7,
      w: 0.5,
      h: 0.3,
      fontSize: 12,
      color: '64748B',
      align: 'center',
      fontFace: 'Arial'
    });

    slideCount++;

    // Optimiser le contenu pour 80-90 mots par slide
    const optimizedChunks = this.optimizeContentForWordCount(reading.text);

    optimizedChunks.forEach((chunk, index) => {
      const slide = pptx.addSlide();
      slide.background = { color: 'F8FAFC' };

      // Titre de la slide
      const slideTitle = `${reading.title} (${index + 1}/${optimizedChunks.length})`;
      
      slide.addText(slideTitle, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: 28,
        color: '1E40AF',
        bold: true,
        align: 'center',
        fontFace: 'Arial'
      });

      // Contenu optimisé
      slide.addText(chunk.content, {
        x: 0.8,
        y: 1.8,
        w: 8.4,
        h: 5,
        fontSize: 20,
        color: '1F2937',
        align: 'left',
        fontFace: 'Arial',
        valign: 'top',
        lineSpacing: 28
      });

      // Indicateur de nombre de mots (pour debug)
      slide.addText(`${chunk.wordCount} mots`, {
        x: 0.5,
        y: 7.2,
        w: 2,
        h: 0.3,
        fontSize: 10,
        color: '94A3B8',
        align: 'left',
        fontFace: 'Arial'
      });

      // Numéro de slide
      slide.addText(`${startSlideNumber + slideCount}`, {
        x: 9.2,
        y: 7,
        w: 0.5,
        h: 0.3,
        fontSize: 12,
        color: '64748B',
        align: 'center',
        fontFace: 'Arial'
      });

      slideCount++;
    });

    return slideCount;
  }

  private static createOptimizedSongSlides(
    pptx: PptxGenJS, 
    song: Song, 
    liturgicalSeason: any, 
    startSlideNumber: number
  ): number {
    let slideCount = 0;

    // Slide de titre pour le chant
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: 'FEF3C7' };

    titleSlide.addText(song.title, {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1.2,
      fontSize: 32,
      color: 'D97706',
      bold: true,
      align: 'center',
      fontFace: 'Arial'
    });

    if (song.author || song.melody) {
      const subtitle = [song.author, song.melody].filter(Boolean).join(' - ');
      titleSlide.addText(subtitle, {
        x: 0.5,
        y: 4,
        w: 9,
        h: 0.6,
        fontSize: 18,
        color: '92400E',
        italic: true,
        align: 'center',
        fontFace: 'Arial'
      });
    }

    // Numéro de slide
    titleSlide.addText(`${startSlideNumber + slideCount}`, {
      x: 9.2,
      y: 7,
      w: 0.5,
      h: 0.3,
      fontSize: 12,
      color: '92400E',
      align: 'center',
      fontFace: 'Arial'
    });

    slideCount++;

    // Optimiser les paroles pour 80-90 mots par slide
    const optimizedVerses = this.optimizeSongForWordCount(song.lyrics);

    optimizedVerses.forEach((verse, index) => {
      const slide = pptx.addSlide();
      slide.background = { color: 'FEF3C7' };

      // Titre de la slide
      const slideTitle = this.generateOptimizedVerseTitle(verse, song.title, index + 1, optimizedVerses.length);
      
      slide.addText(slideTitle, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: 24,
        color: 'D97706',
        bold: true,
        align: 'center',
        fontFace: 'Arial'
      });

      // Paroles optimisées
      slide.addText(verse.content, {
        x: 1,
        y: 1.8,
        w: 8,
        h: 5,
        fontSize: 18,
        color: '1F2937',
        align: 'center',
        fontFace: 'Arial',
        valign: 'top',
        lineSpacing: 24
      });

      // Indicateur de nombre de mots
      slide.addText(`${verse.wordCount} mots`, {
        x: 0.5,
        y: 7.2,
        w: 2,
        h: 0.3,
        fontSize: 10,
        color: '92400E',
        align: 'left',
        fontFace: 'Arial'
      });

      // Numéro de slide
      slide.addText(`${startSlideNumber + slideCount}`, {
        x: 9.2,
        y: 7,
        w: 0.5,
        h: 0.3,
        fontSize: 12,
        color: '92400E',
        align: 'center',
        fontFace: 'Arial'
      });

      slideCount++;
    });

    return slideCount;
  }

  private static optimizeContentForWordCount(text: string): Array<{content: string, wordCount: number}> {
    const sentences = this.splitIntoSentences(text);
    const optimizedChunks: Array<{content: string, wordCount: number}> = [];
    
    let currentChunk = '';
    let currentWordCount = 0;

    for (const sentence of sentences) {
      const sentenceWordCount = this.countWords(sentence);
      const potentialWordCount = currentWordCount + sentenceWordCount;

      // Si ajouter cette phrase dépasse la limite maximale et qu'on a déjà du contenu
      if (potentialWordCount > this.MAX_WORDS_PER_SLIDE && currentWordCount > 0) {
        // Si le chunk actuel est trop petit, essayer d'ajouter une phrase courte
        if (currentWordCount < this.MIN_WORDS_PER_SLIDE && sentenceWordCount <= 15) {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
          currentWordCount = potentialWordCount;
        }
        
        // Finaliser le chunk actuel
        if (currentChunk.trim()) {
          optimizedChunks.push({
            content: currentChunk.trim(),
            wordCount: currentWordCount
          });
        }
        
        // Commencer un nouveau chunk
        currentChunk = sentence;
        currentWordCount = sentenceWordCount;
      } else {
        // Ajouter la phrase au chunk actuel
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentWordCount = potentialWordCount;
      }
    }

    // Ajouter le dernier chunk s'il existe
    if (currentChunk.trim()) {
      optimizedChunks.push({
        content: currentChunk.trim(),
        wordCount: currentWordCount
      });
    }

    // Post-traitement : fusionner les chunks trop petits avec le suivant
    return this.mergeSmallChunks(optimizedChunks);
  }

  private static optimizeSongForWordCount(lyrics: string): Array<{content: string, wordCount: number, type: string}> {
    // Diviser en sections (couplets, refrains)
    const sections = this.splitSongIntoSections(lyrics);
    const optimizedVerses: Array<{content: string, wordCount: number, type: string}> = [];

    for (const section of sections) {
      const wordCount = this.countWords(section.content);
      
      if (wordCount <= this.MAX_WORDS_PER_SLIDE) {
        // La section tient dans une slide
        optimizedVerses.push({
          content: section.content,
          wordCount: wordCount,
          type: section.type
        });
      } else {
        // Diviser la section en plusieurs slides
        const lines = section.content.split('\n');
        let currentVerse = '';
        let currentWordCount = 0;

        for (const line of lines) {
          const lineWordCount = this.countWords(line);
          const potentialWordCount = currentWordCount + lineWordCount;

          if (potentialWordCount > this.MAX_WORDS_PER_SLIDE && currentWordCount > 0) {
            optimizedVerses.push({
              content: currentVerse.trim(),
              wordCount: currentWordCount,
              type: section.type
            });
            
            currentVerse = line;
            currentWordCount = lineWordCount;
          } else {
            currentVerse += (currentVerse ? '\n' : '') + line;
            currentWordCount = potentialWordCount;
          }
        }

        if (currentVerse.trim()) {
          optimizedVerses.push({
            content: currentVerse.trim(),
            wordCount: currentWordCount,
            type: section.type
          });
        }
      }
    }

    return optimizedVerses;
  }

  private static splitIntoSentences(text: string): string[] {
    // Diviser en phrases en préservant la ponctuation
    return text
      .split(/(?<=[.!?])\s+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
  }

  private static splitSongIntoSections(lyrics: string): Array<{content: string, type: string}> {
    const sections: Array<{content: string, type: string}> = [];
    const parts = lyrics.split(/\n\s*\n/);

    for (const part of parts) {
      const trimmedPart = part.trim();
      if (trimmedPart.length === 0) continue;

      let type = 'verse';
      if (trimmedPart.startsWith('R/') || trimmedPart.toLowerCase().includes('refrain')) {
        type = 'refrain';
      } else if (/^\d+\./.test(trimmedPart)) {
        type = 'numbered_verse';
      }

      sections.push({
        content: trimmedPart,
        type: type
      });
    }

    return sections;
  }

  private static countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private static mergeSmallChunks(chunks: Array<{content: string, wordCount: number}>): Array<{content: string, wordCount: number}> {
    const mergedChunks: Array<{content: string, wordCount: number}> = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const currentChunk = chunks[i];
      
      // Si le chunk est trop petit et qu'il y a un chunk suivant
      if (currentChunk.wordCount < this.MIN_WORDS_PER_SLIDE && i < chunks.length - 1) {
        const nextChunk = chunks[i + 1];
        const combinedWordCount = currentChunk.wordCount + nextChunk.wordCount;
        
        // Si la combinaison ne dépasse pas la limite maximale
        if (combinedWordCount <= this.MAX_WORDS_PER_SLIDE) {
          mergedChunks.push({
            content: currentChunk.content + ' ' + nextChunk.content,
            wordCount: combinedWordCount
          });
          i++; // Ignorer le chunk suivant car il a été fusionné
          continue;
        }
      }
      
      mergedChunks.push(currentChunk);
    }
    
    return mergedChunks;
  }

  private static generateOptimizedVerseTitle(verse: any, songTitle: string, index: number, total: number): string {
    let baseTitle = songTitle;
    
    if (verse.type === 'refrain') {
      baseTitle += ' - Refrain';
    } else if (verse.type === 'numbered_verse') {
      const match = verse.content.match(/^(\d+)\./);
      baseTitle += ` - Couplet ${match ? match[1] : index}`;
    } else {
      baseTitle += ` - Partie ${index}`;
    }
    
    return `${baseTitle} (${index}/${total})`;
  }
}