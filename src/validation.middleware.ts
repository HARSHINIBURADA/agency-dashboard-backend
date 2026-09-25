import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Schema for updating a task status
const statusUpdateSchema = Joi.object({
  status: Joi.string().valid('TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE').required()
});

export const validateStatusUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { error } = statusUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      error: 'Validation Failed',
      details: error.details.map(d => d.message)
    });
  }
  next();
};
