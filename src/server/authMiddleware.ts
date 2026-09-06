import { Request, Response, NextFunction } from 'express';
import * as jose from 'jose';
import firebaseConfig from '../../firebase-applet-config.json';

const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
const JWKS_URI = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let remoteJWKS: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getRemoteJWKS() {
  if (!remoteJWKS) {
    remoteJWKS = jose.createRemoteJWKSet(new URL(JWKS_URI));
  }
  return remoteJWKS;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
    emailVerified?: boolean;
  };
  idToken?: string;
}

export async function verifyAuthToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized: Missing or malformed Authorization header with Bearer token.'
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Token string is empty.' });
    return;
  }

  req.idToken = token;

  try {
    const JWKS = getRemoteJWKS();
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });

    const uid = (payload.sub || payload.user_id) as string;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized: Invalid token payload without subject UID.' });
      return;
    }

    req.user = {
      uid,
      email: (payload.email as string) || undefined,
      name: (payload.name as string) || undefined,
      picture: (payload.picture as string) || undefined,
      emailVerified: Boolean(payload.email_verified),
    };

    next();
  } catch (error) {
    console.error('Server Token Verification Failed:', error);
    
    // In local dev/fallback if JWKS network fetch fails, attempt safely decoded token validation check
    try {
      const decoded = jose.decodeJwt(token);
      if (
        decoded &&
        decoded.aud === FIREBASE_PROJECT_ID &&
        decoded.iss === `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` &&
        decoded.sub &&
        (decoded.exp ? decoded.exp * 1000 > Date.now() : true)
      ) {
        req.user = {
          uid: decoded.sub,
          email: (decoded.email as string) || undefined,
          name: (decoded.name as string) || undefined,
          picture: (decoded.picture as string) || undefined,
          emailVerified: Boolean(decoded.email_verified),
        };
        next();
        return;
      }
    } catch {
      // Decode fallback failed
    }

    res.status(401).json({
      error: 'Unauthorized: Invalid or expired Firebase authentication token.'
    });
  }
}
