import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

let io: Server;
const connectedSockets = new Map<string, { userId: string; role: string }>();

export const configureWebSockets = (server: any) => {
  io = new Server(server, { cors: { origin: '*' } });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication packet context unavailable.'));
    
    try {
      const parsed = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { id: string; role: string };
      socket.data = parsed;
      next();
    } catch (e) {
      next(new Error('Session context validation dropped.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { id: uid, role } = socket.data;
    connectedSockets.set(socket.id, { userId: uid, role });

    const activeIds = new Set(Array.from(connectedSockets.values()).map(x => x.userId));
    io.emit('presenceUpdate', { onlineCount: activeIds.size });

    if (role === 'ADMIN') socket.join('channel:ADMIN');
    socket.join('user:${uid}');

    socket.on('joinProjectRoom', (projectId: string) => {
      socket.join('project:${projectId}');
    });

    socket.on('syncMissedEvents', async () => {
      try {
        let fetchSql = '';
        const params: any[] = [];

        if (role === 'ADMIN') {
          fetchSql = 'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 20';
        } else if (role === 'PROJECT_MANAGER') {
          fetchSql = `
            SELECT al.* FROM activity_logs al 
            JOIN projects p ON al.project_id = p.id 
            WHERE p.manager_id = $1 ORDER BY al.created_at DESC LIMIT 20`;
          params.push(uid);
        } else {
          fetchSql = `
            SELECT al.* FROM activity_logs al 
            JOIN tasks t ON al.task_id = t.id 
            WHERE t.developer_id = $1 ORDER BY al.created_at DESC LIMIT 20`;
          params.push(uid);
        }

        const items = await pool.query(fetchSql, params);
        socket.emit('missedEventsPayload', items.rows);
      } catch (err) {
        socket.emit('error', { message: 'Telemetry reconstruction loop failed.' });
      }
    });

    socket.on('disconnect', () => {
      connectedSockets.delete(socket.id);
      const remainingIds = new Set(Array.from(connectedSockets.values()).map(x => x.userId));
      io.emit('presenceUpdate', { onlineCount: remainingIds.size });
    });
  });
};

export const dispatchActivityEvent = (projectId: string, payload: any) => {
  if (!io) return;

  io.to('channel:ADMIN').emit('activityFeedUpdate', payload);
  io.to('project:${projectId}').emit('activityFeedUpdate', payload);
  
  if (payload.developerId) {
    io.to('user:${payload.developerId}').emit('activityFeedUpdate', payload);
  }
};

export const dispatchNotificationEvent = (userId: string, notif: any) => {
  if (!io) return;
  io.to('user:${userId}').emit('incomingNotification', notif);
};
