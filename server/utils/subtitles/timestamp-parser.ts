import type { Result, TimestampValidationRules } from './subtitle-types.js';
import { TimestampError, isBaseError } from './subtitle-errors.js';

export class TimestampParser {
  private static readonly TIMESTAMP_RULES: TimestampValidationRules = {
    format: /^\d{2}:\d{2}:\d{2},\d{3}$/,
    maxValue: 359999999 // 99:59:59,999
  };

  static parse(timestamp: string): Result<number> {
    try {
      console.log('Parsing timestamp:', timestamp);

      // Clean up the timestamp
      const cleanTimestamp = timestamp.trim();

      if (!this.TIMESTAMP_RULES.format.test(cleanTimestamp)) {
        console.error('Invalid timestamp format:', cleanTimestamp);
        return {
          success: false,
          error: new TimestampError(`Invalid timestamp format: ${cleanTimestamp}`)
        };
      }

      const [time, ms] = cleanTimestamp.split(',');
      const [hours, minutes, seconds] = time.split(':').map(Number);

      // Validate components
      if (hours > 99 || minutes > 59 || seconds > 59) {
        console.error('Invalid time components:', { hours, minutes, seconds });
        return {
          success: false,
          error: new TimestampError(`Invalid time values in timestamp: ${cleanTimestamp}`)
        };
      }

      const msNum = Number(ms);
      if (isNaN(msNum) || msNum > 999) {
        console.error('Invalid milliseconds:', ms);
        return {
          success: false,
          error: new TimestampError(`Invalid milliseconds in timestamp: ${cleanTimestamp}`)
        };
      }

      const totalMs = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + msNum;

      if (totalMs > this.TIMESTAMP_RULES.maxValue) {
        console.error('Timestamp exceeds maximum value:', totalMs);
        return {
          success: false,
          error: new TimestampError(`Timestamp exceeds maximum value: ${cleanTimestamp}`)
        };
      }

      console.log('Successfully parsed timestamp:', {
        original: cleanTimestamp,
        milliseconds: totalMs
      });

      return { success: true, data: totalMs };
    } catch (error) {
      const message = isBaseError(error) ? error.message : 'Unknown error';
      console.error('Failed to parse timestamp:', message);
      return {
        success: false,
        error: new TimestampError(`Failed to parse timestamp: ${message}`)
      };
    }
  }

  static format(ms: number): string {
    try {
      console.log('Formatting milliseconds:', ms);

      if (isNaN(ms) || ms < 0) {
        throw new Error(`Invalid milliseconds value: ${ms}`);
      }

      if (ms > this.TIMESTAMP_RULES.maxValue) {
        ms = this.TIMESTAMP_RULES.maxValue;
        console.warn('Clamping milliseconds to maximum value:', ms);
      }

      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      const milliseconds = Math.floor(ms % 1000);

      const formatted = `${this.padZero(hours, 2)}:${this.padZero(minutes, 2)}:${this.padZero(seconds, 2)},${this.padZero(milliseconds, 3)}`;
      console.log('Formatted timestamp:', formatted);

      return formatted;
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      // Return a safe default value
      return '00:00:00,000';
    }
  }

  private static padZero(num: number, width: number): string {
    const str = num.toString();
    return str.length >= width ? str : '0'.repeat(width - str.length) + str;
  }
}

export class SRTTimestamp {
  private ms: number;

  static create(timestamp: string): Result<SRTTimestamp> {
    console.log('Creating SRTTimestamp from:', timestamp);
    const parseResult = TimestampParser.parse(timestamp);
    if (!parseResult.success) {
      console.error('Failed to create SRTTimestamp:', parseResult.error);
      return parseResult;
    }
    console.log('Successfully created SRTTimestamp');
    return { success: true, data: new SRTTimestamp(parseResult.data) };
  }

  constructor(ms: number) {
    if (isNaN(ms) || ms < 0) {
      ms = 0;
      console.warn('Invalid milliseconds value, defaulting to 0');
    }
    this.ms = ms;
  }

  toString(): string {
    return TimestampParser.format(this.ms);
  }

  getMilliseconds(): number {
    return this.ms;
  }
}
