import { Request, Response, NextFunction } from 'express';

export const globalErrorHandler = (
  err: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  console.error('[Runtime App Exception Triggered]:', err.message || err);

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'A structural server exception occurred processing your request.';

  return res.status(statusCode).json({
    status: 'error',
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};