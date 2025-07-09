import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserProfile } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: UserProfile & { id: string };
    }
  }
}

type JwtPayload = {
  userId?: string;
  id?: string;
  [key: string]: any;
};

export const authenticateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
