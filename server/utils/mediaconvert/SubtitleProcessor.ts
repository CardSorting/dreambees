interface SubtitleBlock {
  startTime: string;
  endTime: string;
  text: string;
}

interface SubtitleSettings {
  fontColor: string;
  fontSize: number;
  fontOpacity: number;
  backgroundColor: string;
  backgroundOpacity: number;
  outlineColor: string;
  outlineSize: number;
  position: {
    x: number;
    y: number;
  };
}

export class SubtitleProcessor {
  private static readonly MIN_GAP_MS = 200; // Increased minimum gap for better readability
  private static readonly MAX_DURATION_MS = 5000; // Maximum subtitle duration of 5 seconds
  private static readonly MAX_GAP_MS = 2000; // Maximum gap between subtitles
  private static readonly MIN_DURATION_MS = 800; // Minimum subtitle duration

  private static timeToMs(timeStr: string): number {
    const [hours, minutes, seconds, ms] = timeStr.split(/[:.]/);
    return (
      parseInt(hours) * 3600000 +
      parseInt(minutes) * 60000 +
      parseInt(seconds) * 1000 +
      parseInt(ms)
    );
  }

  private static msToTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds
      .toString()
      .padStart(3, '0')}`;
  }

  public static getDefaultSettings(): SubtitleSettings {
    return {
      fontColor: "WHITE",
      fontSize: 72,
      fontOpacity: 100,
      backgroundColor: "NONE",
      backgroundOpacity: 0,
      outlineColor: "BLACK",
      outlineSize: 6,
      position: {
        x: 540,
        y: 1600
      }
    };
  }

  public static processSubtitles(srtContent: string): string {
    const blocks = this.parseBlocks(srtContent);
    const adjustedBlocks = this.adjustTimings(blocks);
    return this.generateSRT(adjustedBlocks);
  }

  private static parseBlocks(srtContent: string): SubtitleBlock[] {
    const lines = srtContent.trim().split('\n');
    const blocks: SubtitleBlock[] = [];
    let currentBlock: Partial<SubtitleBlock> = {};
    let textLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        if (currentBlock.startTime && textLines.length > 0) {
          blocks.push({
            startTime: currentBlock.startTime!,
            endTime: currentBlock.endTime!,
            text: textLines.join('\n')
          });
          currentBlock = {};
          textLines = [];
        }
        continue;
      }

      if (/^\d+$/.test(trimmedLine)) {
        // Block number, skip
        continue;
      }

      const timeMatch = trimmedLine.match(/(\d{2}:\d{2}:\d{2}[.,]\d{3}) --> (\d{2}:\d{2}:\d{2}[.,]\d{3})/);
      if (timeMatch) {
        // Convert any commas to periods in the timestamps
        currentBlock.startTime = timeMatch[1].replace(',', '.');
        currentBlock.endTime = timeMatch[2].replace(',', '.');
      } else {
        textLines.push(trimmedLine);
      }
    }

    // Handle last block
    if (currentBlock.startTime && textLines.length > 0) {
      blocks.push({
        startTime: currentBlock.startTime!,
        endTime: currentBlock.endTime!,
        text: textLines.join('\n')
      });
    }

    return blocks;
  }

  private static adjustTimings(blocks: SubtitleBlock[]): SubtitleBlock[] {
    const adjustedBlocks: SubtitleBlock[] = [];
    let previousEndTime = 0;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      let startTimeMs = this.timeToMs(block.startTime);
      let endTimeMs = this.timeToMs(block.endTime);
      
      // Calculate initial duration
      let duration = endTimeMs - startTimeMs;
      
      // Enforce minimum and maximum duration
      duration = Math.max(this.MIN_DURATION_MS, Math.min(duration, this.MAX_DURATION_MS));
      
      // Ensure minimum gap from previous subtitle
      startTimeMs = Math.max(startTimeMs, previousEndTime + this.MIN_GAP_MS);
      
      // Check if we need to adjust for large gaps
      if (startTimeMs - previousEndTime > this.MAX_GAP_MS && previousEndTime > 0) {
        startTimeMs = previousEndTime + this.MAX_GAP_MS;
      }
      
      // Calculate new end time based on duration
      endTimeMs = startTimeMs + duration;
      
      // Look ahead to next block if available
      if (i < blocks.length - 1) {
        const nextStartMs = this.timeToMs(blocks[i + 1].startTime);
        // If our adjusted end time would overlap with next subtitle
        if (endTimeMs + this.MIN_GAP_MS > nextStartMs) {
          // Adjust end time to ensure minimum gap
          endTimeMs = nextStartMs - this.MIN_GAP_MS;
          // Ensure we maintain minimum duration
          if (endTimeMs - startTimeMs < this.MIN_DURATION_MS) {
            // If we can't maintain minimum duration, adjust start time backward
            startTimeMs = endTimeMs - this.MIN_DURATION_MS;
            // But don't overlap with previous subtitle
            startTimeMs = Math.max(startTimeMs, previousEndTime + this.MIN_GAP_MS);
            // Final adjustment of end time
            endTimeMs = startTimeMs + this.MIN_DURATION_MS;
          }
        }
      }

      adjustedBlocks.push({
        startTime: this.msToTime(startTimeMs),
        endTime: this.msToTime(endTimeMs),
        text: block.text
      });

      previousEndTime = endTimeMs;
    }

    return adjustedBlocks;
  }

  private static generateSRT(blocks: SubtitleBlock[]): string {
    return blocks
      .map((block, index) => {
        return `${index + 1}\n${block.startTime} --> ${block.endTime}\n${
          block.text
        }\n`;
      })
      .join('\n');
  }

  public static getMediaConvertCaptionSettings(settings: Partial<SubtitleSettings> = {}): any {
    const defaultSettings = this.getDefaultSettings();
    const mergedSettings = { ...defaultSettings, ...settings };

    return {
      DestinationType: "BURN_IN",
      BurninDestinationSettings: {
        BackgroundColor: mergedSettings.backgroundColor,
        BackgroundOpacity: mergedSettings.backgroundOpacity,
        FontColor: mergedSettings.fontColor,
        FontOpacity: mergedSettings.fontOpacity,
        FontResolution: 96,
        FontSize: mergedSettings.fontSize,
        OutlineColor: mergedSettings.outlineColor,
        OutlineSize: mergedSettings.outlineSize,
        ShadowColor: "BLACK",
        ShadowOpacity: 100,
        ShadowXOffset: 4,
        ShadowYOffset: 4,
        TeletextSpacing: "AUTO",
        XPosition: mergedSettings.position.x,
        YPosition: mergedSettings.position.y
      }
    };
  }
}
