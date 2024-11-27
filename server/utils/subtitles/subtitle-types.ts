// Result type for handling success/error responses
export type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

// Options for subtitle generation and processing
export type SubtitleOptions = {
  minDuration: number;
  maxDuration: number;
  charReadingSpeed: number;
  pauseBetweenBlocks: number;
  sentencePause: number;
  audioDuration: number;
};

// Analysis of subtitle synchronization
export type SyncAnalysis = {
  syncScore: number;
  suggestions: string[];
};

// Validation result structure
export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

// Rules for timestamp validation
export type TimestampValidationRules = {
  format: RegExp;
  maxValue: number;
};
