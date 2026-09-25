import cron from 'node-cron';
import pool from '../config/db';

export const startOverdueCronDaemon = () => {

  cron.schedule('0 * * * *', async () => {
    try {
      const processSweepSql = `
        UPDATE tasks 
        SET status = 'OVERDUE'::task_status 
        WHERE due_date < NOW() 
        AND status NOT IN ('DONE'::task_status, 'OVERDUE'::task_status)
      `;
      const sweepExec = await pool.query(processSweepSql);
      if (sweepExec.rowCount && sweepExec.rowCount > 0) {
        console.log('[Daemon Sweep Engine] Success. ${sweepExec.rowCount} workflows flagged OVERDUE.');
      }
    } catch (error) {
      console.error('[Daemon Sweep Core Failure]: Background hourly workflow validation crashed: ', error);
    }
  });
};