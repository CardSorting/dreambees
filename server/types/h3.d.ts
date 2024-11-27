declare module 'h3' {
  export interface H3Event {
    node: {
      req: any;
      res: any;
    };
    path: string;
    context: {
      auth?: {
        uid: string;
        email?: string;
      };
      [key: string]: any;
    };
  }

  export function defineEventHandler<T>(handler: (event: H3Event) => Promise<T>): (event: H3Event) => Promise<T>;
  export function getHeader(event: H3Event, name: string): string | undefined;
  export function readBody<T = any>(event: H3Event): Promise<T>;
  export function createError(opts: { statusCode: number; message: string }): Error;
}
