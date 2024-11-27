import { AuthContext } from './auth'

declare module 'h3' {
  interface H3EventContext {
    auth: AuthContext;
  }
}
