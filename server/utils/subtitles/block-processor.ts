import type { Result } from './subtitle-types.js';
import { BlockError, isBaseError } from './subtitle-errors.js';
import { SRTTimestamp } from './timestamp-parser.js';

if (typeof process === 'undefined' || process.release?.name !== 'node') {
  throw new Error('Subtitle block processor can only be used on the server side')
}

class BlockValidator {
  static validateStructure(lines: string[], index: number): Result<void> {
    console.log(`Validating block structure for index ${index}:`, {
      lineCount: lines.length,
      lines: lines.map(line => line.substring(0, 50))
    });

    // Check minimum line count
    if (lines.length < 3) {
      console.error(`Block ${index} has insufficient lines:`, lines);
      return {
        success: false,
        error: new BlockError(`Invalid block structure (insufficient lines: ${lines.length})`, index)
      };
    }

    // Validate block index
    const blockIndex = parseInt(lines[0].trim());
    if (isNaN(blockIndex) || blockIndex !== index) {
      console.error(`Block ${index} has invalid index:`, {
        expected: index,
        actual: lines[0]
      });
      return {
        success: false,
        error: new BlockError(`Invalid block index (expected: ${index}, got: ${lines[0]})`, index)
      };
    }

    // Validate timestamp format
    const timestampLine = lines[1].trim();
    if (!timestampLine.match(/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/)) {
      console.error(`Block ${index} has invalid timestamp format:`, {
        timestamp: timestampLine,
        pattern: '00:00:00,000 --> 00:00:00,000'
      });
      return {
        success: false,
        error: new BlockError(`Invalid timestamp format: ${timestampLine}`, index)
      };
    }

    // Validate text content - ensure it's not empty after trimming
    const text = lines.slice(2).join('\n').trim();
    if (!text) {
      console.error(`Block ${index} has empty text, using placeholder`);
      lines[2] = ' '; // Add a space as minimum valid content
    }

    console.log(`Block ${index} validation successful`);
    return { success: true, data: undefined };
  }
}

export class SRTBlock {
  private constructor(
    public readonly index: number,
    public readonly startTime: SRTTimestamp,
    public readonly endTime: SRTTimestamp,
    public readonly text: string
  ) {}

  static create(block: string, index: number): Result<SRTBlock> {
    try {
      console.log(`Creating block ${index}:`, {
        content: block.substring(0, 100),
        length: block.length
      });

      // Clean up the block content
      const cleanBlock = block.replace(/\r\n/g, '\n').trim();
      const lines = cleanBlock.split('\n');
      
      // Validate block structure
      const validationResult = BlockValidator.validateStructure(lines, index);
      if (!validationResult.success) {
        return validationResult;
      }

      // Parse timestamps
      const [startStr, endStr] = lines[1].split(' --> ').map(t => t.trim());
      
      const startResult = SRTTimestamp.create(startStr);
      if (!startResult.success) {
        console.error(`Block ${index} failed to parse start timestamp:`, {
          timestamp: startStr,
          error: startResult.error
        });
        return startResult;
      }

      const endResult = SRTTimestamp.create(endStr);
      if (!endResult.success) {
        console.error(`Block ${index} failed to parse end timestamp:`, {
          timestamp: endStr,
          error: endResult.error
        });
        return endResult;
      }

      // Validate timing
      if (startResult.data.getMilliseconds() >= endResult.data.getMilliseconds()) {
        console.error(`Block ${index} has invalid timing:`, {
          start: startStr,
          end: endStr
        });
        return {
          success: false,
          error: new BlockError('End time must be greater than start time', index)
        };
      }

      // Ensure text is never empty
      const text = lines.slice(2).join('\n').trim() || ' ';

      // Create block
      const srtBlock = new SRTBlock(
        index,
        startResult.data,
        endResult.data,
        text
      );

      console.log(`Block ${index} created successfully:`, {
        duration: srtBlock.getDuration(),
        text: srtBlock.text.substring(0, 50)
      });

      return { success: true, data: srtBlock };
    } catch (error) {
      const message = isBaseError(error) ? error.message : 'Unknown error';
      console.error(`Failed to create block ${index}:`, message);
      return {
        success: false,
        error: new BlockError(`Failed to create block: ${message}`, index)
      };
    }
  }

  getDuration(): number {
    return this.endTime.getMilliseconds() - this.startTime.getMilliseconds();
  }

  toString(): string {
    return [
      this.index,
      `${this.startTime.toString()} --> ${this.endTime.toString()}`,
      this.text || ' ' // Ensure text is never empty
    ].join('\n');
  }
}

export class SRTFileParser {
  static parse(content: string): Result<SRTBlock[]> {
    try {
      console.log('Parsing SRT content:', {
        length: content.length,
        sample: content.substring(0, 200)
      });

      // Clean up content and split into blocks
      const cleanContent = content.replace(/\r\n/g, '\n').trim();
      const blocks = cleanContent.split('\n\n').filter(block => block.trim());
      
      if (blocks.length === 0) {
        console.error('Empty subtitle file');
        return {
          success: false,
          error: new BlockError('Empty subtitle file')
        };
      }

      console.log(`Found ${blocks.length} blocks to parse`);

      const parsedBlocks: SRTBlock[] = [];
      const errors: string[] = [];

      blocks.forEach((block, index) => {
        console.log(`Processing block ${index + 1}:`, {
          content: block.substring(0, 100)
        });

        const result = SRTBlock.create(block, index + 1);
        if (result.success) {
          parsedBlocks.push(result.data);
        } else {
          errors.push(`Block ${index + 1}: ${result.error.message}`);
        }
      });

      if (errors.length > 0) {
        console.error('Failed to parse some blocks:', errors);
        return {
          success: false,
          error: new BlockError(`Failed to parse blocks: ${errors.join('; ')}`)
        };
      }

      console.log(`Successfully parsed ${parsedBlocks.length} blocks`);
      return { success: true, data: parsedBlocks };
    } catch (error) {
      const message = isBaseError(error) ? error.message : 'Unknown error';
      console.error('Failed to parse SRT file:', message);
      return {
        success: false,
        error: new BlockError(`Failed to parse SRT file: ${message}`)
      };
    }
  }
}
