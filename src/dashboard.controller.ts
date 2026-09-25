import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import pool from '../config/db';

export const getDashboardAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, role } = req.user!;

  try {
    if (role === 'ADMIN') {
      const stats = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM projects) as total_projects,
          (SELECT COUNT(*) FROM tasks WHERE status = 'OVERDUE') as overdue_tasks,
          COUNT(CASE WHEN status = 'TO_DO' THEN 1 END) as todo_count,
          COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_count,
          COUNT(CASE WHEN status = 'IN_REVIEW' THEN 1 END) as in_review_count,
          COUNT(CASE WHEN status = 'DONE' THEN 1 END) as done_count
        FROM tasks
      `);
      return res.json({ status: 'success', data: stats.rows[0] });
    }

    if (role === 'PROJECT_MANAGER') {
      const pmStats = await pool.query(`
        SELECT 
          COUNT(DISTINCT p.id) as managed_projects,
          COUNT(CASE WHEN t.priority = 'CRITICAL' THEN 1 END) as critical_tasks,
          COUNT(CASE WHEN t.priority = 'HIGH' THEN 1 END) as high_tasks,
          COUNT(CASE WHEN t.due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' THEN 1 END) as due_this_week
        FROM projects p
        LEFT JOIN tasks t ON p.id = t.project_id
        WHERE p.manager_id = $1
        GROUP BY p.manager_id
      `, [userId]);
      return res.json({ 
        status: 'success', 
        data: pmStats.rows[0] || { managed_projects: 0, critical_tasks: 0, high_tasks: 0, due_this_week: 0 } 
      });
    }

    if (role === 'DEVELOPER') {
      const devTasks = await pool.query(`
        SELECT id, title, description, status, priority, due_date 
        FROM tasks 
        WHERE developer_id = $1 
        ORDER BY 
          CASE priority 
            WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 END ASC, 
          due_date ASC
      `, [userId]);
      return res.json({ status: 'success', data: devTasks.rows });
    }
  } catch (error) {
    return res.status(500).json({ status: 'error', error: 'Engine failed processing relational reporting dashboard structures.' });
  }
};

export const queryFilteredTasks = async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, role } = req.user!;
  const { status, priority, startDate, endDate } = req.query;

  try {
    let sql = `
      SELECT t.*, p.name as project_name 
      FROM tasks t 
      JOIN projects p ON t.project_id = p.id 
      WHERE 1=1
    `;
    const tokens: any[] = [];
    let count = 1;

    // Strict Tenant Scope Filtering
    if (role === 'PROJECT_MANAGER') {
      sql += ` AND p.manager_id = $${count++}`;
      tokens.push(userId);
    } else if (role === 'DEVELOPER') {
      sql += ` AND t.developer_id = $${count++}`;
      tokens.push(userId);
    }

    // Dynamic Filter Mapping
    if (status) { sql += ` AND t.status = $${count++}::task_status`; tokens.push(status); }
    if (priority) { sql += ` AND t.priority = $${count++}::task_priority`; tokens.push(priority); }
    if (startDate && endDate) {
      sql += ` AND t.due_date BETWEEN $${count++}::timestamp AND $${count++}::timestamp`;
      tokens.push(startDate, endDate);
    }

    const output = await pool.query(sql, tokens);
    return res.json({ status: 'success', data: output.rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: 'Filtering runtime configuration layer failure.' });
  }
};
