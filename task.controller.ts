import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import pool from '../config/db';
import { dispatchActivityEvent, dispatchNotificationEvent } from '../websocket/socket.engine';

export const updateTaskStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { taskId } = req.params;
  const { status } = req.body;
  const userId = req.user!.id;
  const { role: userRole, email: userEmail } = req.user!;

  const db = await pool.connect();
  try {
    await db.query('BEGIN');

    // 1. Fetch current task details alongside project manager configurations
    const accessQuery = `
      SELECT t.*, p.manager_id FROM tasks t 
      JOIN projects p ON t.project_id = p.id WHERE t.id = $1
    `;
    const checkRes = await db.query(accessQuery, [taskId]);
    
    if (checkRes.rowCount === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ status: 'error', error: 'Target task reference not found.' });
    }

    // Raw SQL returns an array rows, grab the first element object safely [0]
    const currentTask = checkRes.rows[0];

    // 2. Strict Access Control Restrictions matching database columns
    if (userRole === 'DEVELOPER' && currentTask.developer_id !== userId) {
      await db.query('ROLLBACK');
      return res.status(403).json({ status: 'error', error: 'Forbidden. You do not own this assignment scope.' });
    }
    if (userRole === 'PROJECT_MANAGER' && currentTask.manager_id !== userId) {
      await db.query('ROLLBACK');
      return res.status(403).json({ status: 'error', error: 'Forbidden. Project asset mismatch.' });
    }

    const oldStatus = currentTask.status;

    // 3. Mutate Core Task Status Value using uniform parameterized variables
    const updateRes = await db.query('UPDATE tasks SET status = \$1 WHERE id = \$2 RETURNING *', [status, taskId]);
    
    // 4. Save Activity Log directly into the database
    const shortName = userEmail.split('@')[0];
    const logString = '${shortName} moved Task #${taskId.substring(0, 6)} from ${oldStatus} → ${status}';
    
    const logRes = await db.query(`
      INSERT INTO activity_logs (message, user_id, project_id, task_id) 
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [logString, userId, currentTask.project_id, taskId]);

    await db.query('COMMIT');

    // 5. Broadcast real-time updates through Socket channels
    dispatchActivityEvent(currentTask.project_id, {
      ...logRes.rows[0],
      formattedText: logString,
      developerId: currentTask.developer_id,
      managerId: currentTask.manager_id
    });

    // 6. Notify Project Manager if marked ready for structural review
    if (status === 'IN_REVIEW') {
      const msg = 'Task ${currentTask.title} updated to In Review phase.';
      const notifRes = await pool.query('INSERT INTO notifications (user_id, message) VALUES (\$1, \$2) RETURNING *', [currentTask.manager_id, msg]);
      dispatchNotificationEvent(currentTask.manager_id, notifRes.rows[0]);
    }

    return res.json({ status: 'success', data: updateRes.rows[0] });
  } catch (err) {
    await db.query('ROLLBACK');
    return res.status(500).json({ status: 'error', error: 'State machine mutation process failure.' });
  } finally {
    db.release();
  }
};