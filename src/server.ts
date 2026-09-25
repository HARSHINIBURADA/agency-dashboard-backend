import http from 'http';
import app from './app';
import { configureWebSockets } from './websocket/socket.engine';
import { startOverdueCronDaemon } from './jobs/overdue.cron';

const server = http.createServer(app);

configureWebSockets(server);
startOverdueCronDaemon();  

const TARGET_PORT = process.env.PORT || 5000;
server.listen(TARGET_PORT, () => {
  console.log('================================================================');
  console.log('🚀 [Dashboard Application Server] ONLINE and executing cleanly!');
  console.log('🔗 Local Access Point: http://localhost:5000');
  console.log('================================================================');
});
