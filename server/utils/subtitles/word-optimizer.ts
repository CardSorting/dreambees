import type { Result, SubtitleOptions } from './subtitle-types.js';
import { ValidationError, isBaseError } from './subtitle-errors.js';
import { SRTBlock, SRTFileParser } from './block-processor.js';
import { SRTTimestamp, TimestampParser } from './timestamp-parser.js';
import type { WordTiming } from '../script-generator.js';

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Word optimizer can only be used on the server side')
}

export class WordOptimizer {
  constructor(private options: SubtitleOptions) {}

  private validateWordTiming(timing: WordTiming): boolean {
    const isValid = (
      typeof timing.word === 'string' &&
      typeof timing.start === 'number' &&
      typeof timing.end === 'number' &&
      timing.start >= 0 &&
      timing.end >= timing.start &&
      timing.end <= this.options.audioDuration &&
      timing.word.trim().length > 0
    );

    if (!isValid) {
      return false;
    }

    return true;
  }

  private adjustWordTiming(timing: WordTiming, previousEndTime: number): WordTiming {
    const minGap = 50; // Minimum 50ms gap between subtitles
    let { start, end } = timing;

    // Ensure minimum gap from previous subtitle
    if (start < previousEndTime + minGap) {
      start = previousEndTime + minGap;
    }

    // If start and end times are the same or too close, add minimum duration
    if (end <= start + this.options.minDuration) {
      end = start + this.options.minDuration;
    }

    // Ensure we don't exceed audio duration
    if (end > this.options.audioDuration) {
      end = this.options.audioDuration;
      // If this makes the duration too short, adjust start time
      if (end - start < this.options.minDuration) {
        start = Math.max(0, end - this.options.minDuration);
      }
    }

    return {
      word: timing.word,
      start,
      end
    };
  }

  private sanitizeWord(word: string): string {
    // Remove any characters that might interfere with SRT format and trim whitespace
    const sanitized = word.trim().replace(/[\n\r]/g, ' ');
    return sanitized || ' '; // Ensure we never return an empty string
  }

  private createSRTBlock(index: number, startTime: string, endTime: string, text: string): string {
    const sanitizedText = text.trim() || ' '; // Ensure text is never empty
    return `${index}\n${startTime} --> ${endTime}\n${sanitizedText}\n`;
  }

  optimizeToWords(blocks: SRTBlock[], wordTimings?: WordTiming[]): Result<SRTBlock[]> {
    try {
      console.log('Starting word optimization');
      console.log('Options:', this.options);
      console.log('Word timings available:', !!wordTimings);

      // If we have word timings from Whisper, validate and use them
      if (wordTimings && wordTimings.length > 0) {
        console.log('Using Whisper word timings');
        console.log('Number of word timings:', wordTimings.length);

        // Filter out invalid word timings and empty/whitespace words
        const validTimings = wordTimings.filter(timing => {
          const isValid = this.validateWordTiming(timing);
          if (!isValid) {
            console.warn('Invalid word timing:', timing);
          }
          return isValid;
        });

        if (validTimings.length === 0) {
          console.error('No valid word timings found');
          throw new Error('No valid word timings found');
        }

        console.log('Valid word timings:', validTimings.length);

        // Adjust timings to ensure proper spacing and minimum duration
        let previousEndTime = 0;
        const adjustedTimings = validTimings.map(timing => {
          const adjusted = this.adjustWordTiming(timing, previousEndTime);
          previousEndTime = adjusted.end;
          return adjusted;
        });

        // Create SRT blocks from word timings
        const srtContent = adjustedTimings
          .map((timing, index) => {
            const startTime = TimestampParser.format(timing.start);
            const endTime = TimestampParser.format(timing.end);
            const sanitizedWord = this.sanitizeWord(timing.word);
            return this.createSRTBlock(index + 1, startTime, endTime, sanitizedWord);
          })
          .join('\n');

        console.log('Generated SRT content sample:', srtContent.substring(0, 200) + '...');

        // Parse the formatted SRT content
        const parseResult = SRTFileParser.parse(srtContent);
        if (!parseResult.success) {
          console.error('Failed to parse word-timed blocks:', parseResult.error);
          return parseResult;
        }

        return { success: true, data: parseResult.data };
      }

      // Fallback to estimation-based timing
      console.log('Using estimation-based timing');
      const allWords = blocks
        .map(block => block.text.split(/\s+/).filter(word => word.trim()))
        .flat();

      console.log('Total words to process:', allWords.length);
      
      const totalWords = allWords.length;
      const avgTimePerWord = Math.max(
        this.options.minDuration,
        Math.min(
          this.options.maxDuration,
          Math.floor((this.options.audioDuration - (totalWords * 50)) / totalWords) // Reserve time for gaps
        )
      );

      console.log('Average time per word:', avgTimePerWord);

      let currentTime = 0;
      const srtBlocks: string[] = [];

      for (let i = 0; i < allWords.length; i++) {
        const word = this.sanitizeWord(allWords[i]);
        if (!word) {
          console.log('Skipping empty word at index:', i);
          continue;
        }

        // Calculate word duration
        const wordLength = word.length;
        const baseLength = wordLength * this.options.charReadingSpeed;
        const hasPunctuation = word.match(/[.!?,;]$/);
        const punctuationPause = hasPunctuation ? this.options.sentencePause : 0;
        
        let duration = Math.min(
          Math.max(
            baseLength + punctuationPause,
            avgTimePerWord * 0.8,
            this.options.minDuration
          ),
          this.options.maxDuration,
          avgTimePerWord * 1.5
        );

        // Ensure we don't exceed audio duration
        const remainingTime = this.options.audioDuration - currentTime;
        if (duration > remainingTime) {
          duration = Math.max(this.options.minDuration, remainingTime - 100);
        }

        // Format block
        const startTime = TimestampParser.format(currentTime);
        const endTime = TimestampParser.format(currentTime + duration);
        
        srtBlocks.push(this.createSRTBlock(i + 1, startTime, endTime, word));

        // Update timing for next word with minimum gap
        const pauseDuration = hasPunctuation 
          ? this.options.pauseBetweenBlocks * 2 
          : this.options.pauseBetweenBlocks;
        
        currentTime += duration + Math.min(50, remainingTime - duration); // Ensure minimum 50ms gap
      }

      const srtContent = srtBlocks.join('\n');
      console.log('Generated SRT content sample:', srtContent.substring(0, 200) + '...');

      // Parse the formatted SRT content
      const parseResult = SRTFileParser.parse(srtContent);
      if (!parseResult.success) {
        console.error('Failed to parse estimated-time blocks:', parseResult.error);
        return parseResult;
      }

      return { success: true, data: parseResult.data };

    } catch (error) {
      const message = isBaseError(error) ? error.message : 'Unknown error';
      console.error('Failed to optimize words:', message);
      return {
        success: false,
        error: new ValidationError('Failed to optimize words', [message])
      };
    }
  }

  static createFromText(text: string, options: SubtitleOptions, wordTimings?: WordTiming[]): Result<string> {
    try {
      console.log('Creating word-based subtitles from text');
      console.log('Text length:', text.length);
      console.log('Word timings available:', !!wordTimings);

      // Create initial block with the entire text
      const initialBlock = `1\n00:00:00,000 --> 00:00:01,000\n${text || ' '}\n`;
      
      // Parse the initial block
      const parseResult = SRTFileParser.parse(initialBlock);
      if (!parseResult.success) {
        console.error('Failed to parse initial block:', parseResult.error);
        return parseResult;
      }

      // Create optimizer and process the blocks with word timings if available
      const optimizer = new WordOptimizer(options);
      const optimizeResult = optimizer.optimizeToWords(parseResult.data, wordTimings);
      if (!optimizeResult.success) {
        console.error('Failed to optimize blocks:', optimizeResult.error);
        return optimizeResult;
      }

      // Convert optimized blocks back to SRT format
      const srtContent = optimizeResult.data
        .map(block => block.toString())
        .join('\n\n') + '\n';

      console.log('Generated SRT content sample:', srtContent.substring(0, 200) + '...');
      return { success: true, data: srtContent };
    } catch (error) {
      const message = isBaseError(error) ? error.message : 'Unknown error';
      console.error('Failed to create word-based subtitles:', message);
      return {
        success: false,
        error: new ValidationError('Failed to create word-based subtitles', [message])
      };
    }
  }
}
