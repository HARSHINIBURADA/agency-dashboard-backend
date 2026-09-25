# Real-Time Project Management Analytics API Platform

A secure, high-performance multi-tenant backend built using *Node.js, Express, TypeScript, and Raw PostgreSQL SQL queries* to power internal client project dashboards.

## Architecture & Technical Decisions

- *Raw SQL Queries Over ORMs:* Bypassed heavy ORMs to write optimized, parameterized raw SQL commands. This reduces memory overhead, eliminates unnecessary database abstraction layers, and ensures immediate defense against SQL Injection vulnerabilities.
- *WebSocket Library Choice:* Implemented Socket.io due to its robust native fallback handling (HTTP long-polling drops automatically if active state connections are interrupted) and out-of-the-box support for workspace room grouping mechanics.
- *Task Overdue Management:* Utilized node-cron to build a background sweeper daemon running at the top of every hour. This checks deadline compliance efficiently without triggering costly calculations during user page loading states.
- *Token Security Blueprint:* Authentication runs on short-lived JWT access tokens backed by long-lived refresh tokens stored inside secure, cross-site-scripting (XSS) isolated *HttpOnly Cookies*.

## Target Performance Indexes applied (init.sql)
- idx_tasks_status_priority_due on tasks(status, priority, due_date): Accelerates real-time sorting matrices for the dashboard workspace feeds.
- idx_activity_logs_project_created on activity_logs(project_id, created_at DESC): Minimizes read bottlenecks when recovering offline node telemetry history logs.
