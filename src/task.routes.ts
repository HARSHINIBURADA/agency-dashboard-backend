import { Router } from 'express';
import { updateTaskStatus } from '../controllers/task.controller';
import { getDashboardAnalytics, queryFilteredTasks } from '../controllers/dashboard.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';

const router = Router();

// SECURITY CHECKPOINT: Every link below this line requires a valid logged-in user token
router.use(authenticateJWT);

// Get dashboard statistics (The function internally customizes what you see by your role)
router.get('/dashboard/analytics', getDashboardAnalytics);

// Filter tasks by date range, priority, or status
router.get('/dashboard/tasks', queryFilteredTasks);

// Update a task status (ADMIN, PROJECT_MANAGER, and DEVELOPER are all allowed to try)
router.patch('/:taskId/status', authorizeRoles('ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'), updateTaskStatus);

export default router;
