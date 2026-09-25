import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRouter from './routes/auth.routes';
import taskRouter from './routes/task.routes';
import { globalErrorHandler } from './middlewares/error.middleware';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/tasks', taskRouter);

app.use((req, res) => {
  res.status(404).json({ status: 'error', error: 'Requested API resource endpoint path cannot be found.' });
});

app.use(globalErrorHandler);

export default app;