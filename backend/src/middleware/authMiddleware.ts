import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

// Extend Express Request type to include user
export interface AuthenticatedRequest<P = {}, ResBody = any, ReqBody = any, ReqQuery = any> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    email: string;
    name?: string;
    [key: string]: any; // Allow additional properties
  };
}

// This is a type guard to check if the request is authenticated
export function isAuthenticated(req: Request): req is AuthenticatedRequest {
  return (req as AuthenticatedRequest).user !== undefined;
}

type JwtPayload = {
  userId?: string;
  id?: string;
  email?: string;
  role?: string;
};

export const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization || '';
    
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'No valid authorization token provided'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid token format'
      });
      return;
    }

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not found'
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired token'
    });
  }
};
