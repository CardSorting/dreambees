export interface AuthContext {
  uid: string;
  firebaseToken?: string;
}

export interface ClerkSession {
  userId: string;
  status: string;
  lastActiveAt: number;
  expireAt: number;
}

export interface RequestContext {
  auth: AuthContext;
}

// Type guard to check if auth context is valid
export function isValidAuthContext(auth: any): auth is AuthContext {
  return typeof auth === 'object' && 
         typeof auth.uid === 'string' && 
         (auth.firebaseToken === undefined || typeof auth.firebaseToken === 'string');
}
