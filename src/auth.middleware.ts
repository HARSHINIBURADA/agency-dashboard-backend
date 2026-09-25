import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Express Request type to include authenticated user details
export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string; email: string };
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      status: 'error', 
      error: 'Authentication required. Authorization header missing.' 
    });
  }

  // Extract the token from the "Bearer <TOKEN>" string
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { id: string; role: string; email: string };
    req.user = decoded; // Attach user context to the request object
    next(); // Pass control to the next middleware or controller
  } catch (err) {
    return res.status(403).json({ 
      status: 'error', 
      error: 'Session signature validation failure or expired token.' 
    });
  }
};
