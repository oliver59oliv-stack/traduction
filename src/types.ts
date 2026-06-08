export type ProficiencyLevel = 
  | "Beginner (A1)" 
  | "Elementary (A2)" 
  | "Intermediate (B1)" 
  | "Upper-Intermediate (B2)" 
  | "Advanced (C1)";

export type LearningInterest = 
  | "travel" 
  | "business" 
  | "casual" 
  | "academic" 
  | "literature" 
  | "tech" 
  | "daily_life";

export interface UserProfile {
  nativeLanguage: string;
  targetLanguage: string;
  level: ProficiencyLevel;
  interests: LearningInterest;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  reply?: string;
  correction?: string;
  translation?: string;
  suggestedResponses?: string[];
  timestamp: string;
}

export interface VocabularyWord {
  word: string;
  phonetic: string;
  meaning: string;
  exampleSentence: string;
  exampleTranslation: string;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  translation: string;
}

export interface GrammarTip {
  concept: string;
  explanation: string;
  examples: {
    text: string;
    translation: string;
  }[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface PersonalizedLesson {
  title: string;
  description: string;
  vocabulary: VocabularyWord[];
  dialogue: DialogueLine[];
  grammarTip: GrammarTip;
  practiceQuiz: QuizQuestion[];
}

export interface SegmentBreakdown {
  wordOrPhrase: string;
  partOfSpeech: string;
  meaning: string;
  grammaticalDetail: string;
}

export interface SentenceAnalysis {
  literalTranslation: string;
  breakdown: SegmentBreakdown[];
  culturalOrIdiomaticNote: string;
}
