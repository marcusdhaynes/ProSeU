
'use client';
/**
 * @fileOverview Core logic for the Universitas pedagogical content engine.
 */

export interface Concept {
  id: string;
  ID: string;
  DM: string;
  FL: string;
  CR: string;
  principle_code?: string; // Links to Principles collection
  TR: number;
  VL: number;
  CN: string;
  PM: string; // Changed from PR (Prompt)
  MS: string; // Mastery
  PN: string; // Principle (Display Name)
  RC: string;
  RI: string;
  DT: string;
  ES: string;
  EA: string;
  HN: string;
  MN: string;
  [key: string]: any;
}

export interface Question {
  id: string;
  conceptId: string;
  type: 'reading' | 'multiple_choice' | 'matching' | 'scenario';
  prompt: string;
  correctAnswer: string;
  choices?: string[];
  explanation?: string;
  hint?: string;
  mnemonic?: string;
  conceptName?: string;
}

// Updated to include MS, PN and rename PR to PM
export const MULTI_ROW_COLUMNS = ['MS', 'PN', 'PM', 'RC', 'RI', 'DT', 'ES', 'EA', 'HN', 'MN'];

/**
 * Core engine for dynamic knowledge generation from atomic pedagogical units.
 */
export const contentEngine = {
  /**
   * Reconstructs a concept by joining indexed fields into multi-line strings.
   * Handles legacy format (KEY__01), 3-digit format (KEY001), and new format (KEY01) automatically.
   * Normalizes keys by treating those with and without "__" as equivalent.
   */
  reconstructConcept: (data: any): Concept => {
    const result = { ...data };
    MULTI_ROW_COLUMNS.forEach(col => {
      const lineMap: Record<number, string> = {};
      Object.keys(data).forEach(k => {
        // Normalize by ignoring "__" separator
        // For PM (Prompt), also check legacy PR fields
        const searchPattern = (col === 'PM') ? `(?:PM|PR)` : col;
        const match = k.match(new RegExp(`^${searchPattern}(?:__|)(\\d{2,3})$`));
        if (match && data[k]) {
          const index = parseInt(match[1], 10);
          // Standardize on the first value found if multiple variants exist
          // Preference for current column name if a legacy field exists
          if (!lineMap[index] || k.startsWith(col)) {
            lineMap[index] = String(data[k]);
          }
        }
      });
      
      const lines = Object.keys(lineMap)
        .map(Number)
        .sort((a, b) => a - b)
        .map(idx => lineMap[idx]);
      
      if (lines.length > 0) {
        result[col] = lines.join('\n');
      } else if (col === 'PM' && data.PR) {
        // Fallback for legacy non-indexed base field
        result.PM = data.PR;
      }
    });
    return result as Concept;
  },

  /**
   * Generates a full question set for a learning session.
   */
  generateQuestionSet: (concepts: Concept[], mode: string): Question[] => {
    return concepts.flatMap((concept, idx) => {
      // Sequence: Introduce with reading, then test with MC
      return [
        contentEngine.generateQuestionFromConcept(concept, 'reading', concepts),
        contentEngine.generateQuestionFromConcept(concept, 'multiple_choice', concepts)
      ];
    });
  },

  /**
   * Generates a specific question from a concept unit.
   */
  generateQuestionFromConcept: (concept: Concept, type: Question['type'], allConcepts: Concept[]): Question => {
    switch (type) {
      case 'multiple_choice':
        // Split strings by newline to handle multiple options
        const rcs = concept.RC?.split('\n').map(s => s.trim()).filter(Boolean) || [];
        const ris = concept.RI?.split('\n').map(s => s.trim()).filter(Boolean) || [];
        
        const correctAnswer = rcs[0] || '';
        const distractors = ris;
        
        const otherCorrects = allConcepts
          .filter(c => c.id !== concept.id)
          .sort(() => 0.5 - Math.random())
          .slice(0, 2)
          .map(c => c.RC?.split('\n')[0].trim())
          .filter(Boolean);
        
        const finalChoices = [correctAnswer, ...distractors, ...otherCorrects]
          .filter(Boolean)
          .slice(0, 4)
          .sort(() => 0.5 - Math.random());

        return {
          id: `mc-${concept.id}`,
          conceptId: concept.id,
          type,
          prompt: concept.PM || `Identify the correct response for: ${concept.CN}`,
          correctAnswer: correctAnswer,
          choices: finalChoices as string[],
          explanation: concept.DT,
          hint: concept.HN,
          mnemonic: concept.MN,
          conceptName: concept.CN
        };

      case 'reading':
      default:
        const promptText = `
          Concept: ${concept.CN}
          
          ${concept.DT}
          
          Example: ${concept.ES?.split('\n').join(', ')}
          Opposite: ${concept.EA?.split('\n').join(', ')}
        `.trim();

        return {
          id: `read-${concept.id}`,
          conceptId: concept.id,
          type: 'reading',
          prompt: promptText,
          correctAnswer: 'continue',
          conceptName: concept.CN
        };
    }
  }
};
