import { Router } from 'express';
import { login, refreshSession } from '../controllers/auth.controller';

const router = Router();

// Public Link: When someone sends data to /api/auth/login, run the login function
router.post('/login', login);

// Public Link: When someone hits /api/auth/refresh, renew their access token
router.post('/refresh', refreshSession);

export default router;