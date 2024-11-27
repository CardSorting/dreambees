import type { Result, SyncAnalysis } from './subtitle-types.js';
import { SyncError, isBaseError } from './subtitle-errors.js';
import { SRTBlock } from './block-processor.js';

export class SyncAnalyzer {
  analyze(blocks: SRTBlock[], audioDuration: number): Result<SyncAnalysis> {
    try {
      if (blocks.length === 0) {
        return {
          success: true,
          data: {
            syncScore: 0,
            suggestions: ['No subtitle blocks found']
          }
        };
      }

      const suggestions: string[] = [];
      let syncScore = 100;
      let previousEnd = 0;

      blocks.forEach((block, index) => {
        const startTime = block.startTime.getMilliseconds();
        const endTime = block.endTime.getMilliseconds();

        // Check if subtitles extend beyond audio duration
        if (endTime > audioDuration) {
          syncScore -= 20;
          suggestions.push(`Block ${index + 1}: Subtitles extend beyond audio duration`);
        }

        // Check for overlapping subtitles
        if (startTime < previousEnd) {
          syncScore -= 5;
          suggestions.push(`Block ${index + 1}: Overlap with previous subtitle`);
        }

        // Check for large gaps between subtitles
        if (startTime - previousEnd > 2000) {
          syncScore -= 2;
          suggestions.push(`Block ${index + 1}: Large gap from previous subtitle`);
        }

        previousEnd = endTime;
      });

      // Check if last subtitle ends too early
      const lastBlock = blocks[blocks.length - 1];
      const unusedTime = audioDuration - lastBlock.endTime.getMilliseconds();
      if (unusedTime > 3000) {
        syncScore -= 10;
        suggestions.push('Significant unused audio duration at the end');
      }

      // Check average duration per word
      const totalDuration = blocks.reduce((sum, block) => sum + block.getDuration(), 0);
      const averageDuration = totalDuration / blocks.length;
      if (averageDuration < 300 || averageDuration > 2000) {
        syncScore -= 5;
        suggestions.push(`Average word duration (${Math.round(averageDuration)}ms) is outside optimal range`);
      }

      return {
        success: true,
        data: {
          syncScore: Math.max(0, syncScore),
          suggestions: [...new Set(suggestions)] // Remove duplicates
        }
      };
    } catch (error) {
      const message = isBaseError(error) ? error.message : 'Unknown error';
      return {
        success: false,
        error: new SyncError(`Failed to analyze sync points: ${message}`)
      };
    }
  }
}
