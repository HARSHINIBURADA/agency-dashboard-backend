import pool from '../src/config/db';
import bcrypt from 'bcrypt';

async function executeDataSeeding() {
  const secretHash = await bcrypt.hash('SecureAgencyPass123!', 10);
  
  console.log('Commencing database structural data initialization routines...');

  // Wipe existing logs and notifications to prevent foreign key constraint violations on hot-reloads
  await pool.query('TRUNCATE notifications, activity_logs, tasks, projects, users CASCADE');

  // 1. Generate core platform identities (1 Admin, 2 PMs, 4 Developers)
  const admin = await pool.query("INSERT INTO users (email, password, role) VALUES ('admin@agency.internal', $1, 'ADMIN') RETURNING id", [secretHash]);
  const pm1 = await pool.query("INSERT INTO users (email, password, role) VALUES ('pm_alpha@agency.internal', $1, 'PROJECT_MANAGER') RETURNING id", [secretHash]);
  const pm2 = await pool.query("INSERT INTO users (email, password, role) VALUES ('pm_beta@agency.internal', $1, 'PROJECT_MANAGER') RETURNING id", [secretHash]);
  
  const dev1 = await pool.query("INSERT INTO users (email, password, role) VALUES ('dev_one@agency.internal', $1, 'DEVELOPER') RETURNING id", [secretHash]);
  const dev2 = await pool.query("INSERT INTO users (email, password, role) VALUES ('dev_two@agency.internal', $1, 'DEVELOPER') RETURNING id", [secretHash]);
  const dev3 = await pool.query("INSERT INTO users (email, password, role) VALUES ('dev_three@agency.internal', $1, 'DEVELOPER') RETURNING id", [secretHash]);
  const dev4 = await pool.query("INSERT INTO users (email, password, role) VALUES ('dev_four@agency.internal', $1, 'DEVELOPER') RETURNING id", [secretHash]);

  // 2. Provision 3 projects
  const p1 = await pool.query("INSERT INTO projects (name, client_id, manager_id) VALUES ('Core Analytics API Engine', 'client_stranger_things', $1) RETURNING id", [pm1.rows[0].id]);
  const p2 = await pool.query("INSERT INTO projects (name, client_id, manager_id) VALUES ('E-Commerce Micro-Frontend', 'client_acme_corp', $1) RETURNING id", [pm1.rows[0].id]);
  const p3 = await pool.query("INSERT INTO projects (name, client_id, manager_id) VALUES ('Enterprise CRM Platform', 'client_gotham_logistics', $1) RETURNING id", [pm2.rows[0].id]);

  // 3. Populate project tasks with mixed parameters, including 2 pre-flagged OVERDUE tasks
  const historicDate = new Date(Date.now() - 172800000); // 2 days ago
  const validFutureDate = new Date(Date.now() + 604800000); // 7 days in future

  const t1 = await pool.query("INSERT INTO tasks (title, description, status, priority, due_date, project_id, developer_id) VALUES ('Configure WebSocket Engine Layout', 'Define Socket pipelines securely', 'IN_PROGRESS', 'CRITICAL', $1, $2, $3) RETURNING id", [validFutureDate, p1.rows[0].id, dev1.rows[0].id]);
  const t2 = await pool.query("INSERT INTO tasks (title, description, status, priority, due_date, project_id, developer_id) VALUES ('Setup Database Clustering Architecture', 'Create indexing parameters', 'OVERDUE', 'CRITICAL', $1, $2, $3) RETURNING id", [historicDate, p1.rows[0].id, dev2.rows[0].id]);
  const t3 = await pool.query("INSERT INTO tasks (title, description, status, priority, due_date, project_id, developer_id) VALUES ('Configure SSL Access Termination Layers', 'Re-route internal proxies', 'OVERDUE', 'HIGH', $1, $2, $3) RETURNING id", [historicDate, p2.rows[0].id, dev3.rows[0].id]);

  // 4. Inject structural baseline logs for feed rendering
  await pool.query("INSERT INTO activity_logs (message, user_id, project_id, task_id) VALUES ('System base migration deployed successfully.', $1, $2, $3)", [admin.rows[0].id, p1.rows[0].id, t1.rows[0].id]);

  console.log('Database structural verification data seeding complete.');
  process.exit(0);
}

executeDataSeeding().catch(err => {
  console.error('Seeding process fatal runtime crash: ', err);
  process.exit(1);
});