declare module '@upstash/redis' {
  export class Redis {
    constructor(config: { url: string; token: string });
    get<T>(key: string): Promise<T>;
    set(key: string, value: any): Promise<void>;
    smembers(key: string): Promise<string[]>;
    rpush(key: string, value: string): Promise<void>;
    lpop<T>(key: string): Promise<T>;
  }
}
