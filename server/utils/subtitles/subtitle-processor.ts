import type { Result, SubtitleOptions, SyncAnalysis } from './subtitle-types.js';
import { ValidationError } from './subtitle-errors.js';
import { SRTFileParser } from './block-processor.js';
import { WordOptimizer } from './word-optimizer.js';
import { SyncAnalyzer } from './sync-analyzer.js';
import type { WordTiming } from '../script-generator.js';

export function improveSubtitles(
  rawTranscription: string, 
  options: SubtitleOptions,
  wordTimings?: WordTiming[]
): Result<string> {
  try {
    console.log('Improving subtitles with options:', options);
    console.log('Word timings available:', !!wordTimings);
    if (wordTimings) {
      console.log('Sample word timings:', wordTimings.slice(0, 3));
    }

    // Create initial SRT content from word timings
    if (wordTimings && wordTimings.length > 0) {
      console.log('Using word timings to create SRT content');
      const optimizer = new WordOptimizer(options);
      const initialBlock = `1\n00:00:00,000 --> 00:00:01,000\n${rawTranscription}\n`;
      
      // Parse the initial block
      const parseResult = SRTFileParser.parse(initialBlock);
      if (!parseResult.success) {
        console.error('Failed to parse initial block:', parseResult.error);
        return parseResult;
      }

      // Optimize using word timings
      const optimizeResult = optimizer.optimizeToWords(parseResult.data, wordTimings);
      if (!optimizeResult.success) {
        console.error('Failed to optimize with word timings:', optimizeResult.error);
        return optimizeResult;
      }

      // Convert optimized blocks back to SRT format
      const srtContent = optimizeResult.data
        .map(block => block.toString())
        .join('\n\n') + '\n';

      console.log('Generated SRT content sample:', srtContent.substring(0, 200) + '...');
      return { success: true, data: srtContent };
    }

    // Fallback to traditional parsing if no word timings
    console.log('No word timings available, using traditional parsing');
    const parseResult = SRTFileParser.parse(rawTranscription);
    if (!parseResult.success) {
      console.error('Failed to parse transcription:', parseResult.error);
      return parseResult;
    }

    // Create word-by-word optimized subtitles
    const optimizer = new WordOptimizer(options);
    const optimizeResult = optimizer.optimizeToWords(parseResult.data);
    if (!optimizeResult.success) {
      console.error('Failed to optimize traditionally:', optimizeResult.error);
      return optimizeResult;
    }

    // Convert optimized blocks back to SRT format
    const srtContent = optimizeResult.data
      .map(block => block.toString())
      .join('\n\n') + '\n';

    console.log('Generated SRT content sample:', srtContent.substring(0, 200) + '...');
    return { success: true, data: srtContent };
  } catch (error: any) {
    console.error('Failed to improve subtitles:', error);
    return {
      success: false,
      error: new ValidationError('Failed to improve subtitles', [error.message])
    };
  }
}

export function analyzeSyncPoints(subtitles: string, audioDuration: number): Result<SyncAnalysis> {
  console.log('Analyzing subtitle sync points...');
  console.log('Audio duration:', audioDuration);
  console.log('Subtitles sample:', subtitles.substring(0, 200) + '...');

  // Parse the subtitles
  const parseResult = SRTFileParser.parse(subtitles);
  if (!parseResult.success) {
    console.error('Failed to parse subtitles for sync analysis:', parseResult.error);
    return parseResult;
  }

  // Analyze synchronization
  const analyzer = new SyncAnalyzer();
  const result = analyzer.analyze(parseResult.data, audioDuration);
  
  if (result.success) {
    console.log('Sync analysis result:', result.data);
  } else {
    console.error('Sync analysis failed:', result.error);
  }

  return result;
}

// Helper function to create word-by-word subtitles directly from text
export function createWordByWordSubtitles(
  text: string, 
  options: SubtitleOptions,
  wordTimings?: WordTiming[]
): Result<string> {
  console.log('Creating word-by-word subtitles');
  console.log('Options:', options);
  console.log('Word timings available:', !!wordTimings);
  return WordOptimizer.createFromText(text, options, wordTimings);
}
