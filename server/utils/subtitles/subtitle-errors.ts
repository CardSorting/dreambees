// Base error class for all subtitle processing errors
export abstract class SubtitleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Set prototype explicitly for better error handling
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TimestampError extends SubtitleError {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, TimestampError.prototype);
  }
}

export class BlockError extends SubtitleError {
  constructor(message: string, public blockIndex?: number) {
    super(message);
    Object.setPrototypeOf(this, BlockError.prototype);
  }
}

export class ValidationError extends SubtitleError {
  constructor(message: string, public details: string[]) {
    super(message);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class SyncError extends SubtitleError {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, SyncError.prototype);
  }
}

// Type guard functions
export function isBaseError(error: unknown): error is Error {
  return error instanceof Error;
}

export function isSubtitleError(error: unknown): error is SubtitleError {
  return error instanceof SubtitleError;
}
