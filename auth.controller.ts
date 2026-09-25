import { Request, Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ status: 'error', error: 'Email and password fields are required.' });
  }

  try {
    // Search for the user in the database
    const userSearch = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userSearch.rowCount === 0) {
      return res.status(401).json({ status: 'error', error: 'Invalid user credentials.' });
    }

    const user = userSearch.rows[0];

    // Check if the provided password matches the hashed password in the database
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      return res.status(401).json({ status: 'error', error: 'Invalid user credentials.' });
    }

    // Generate a short-lived access token (expires in 15 minutes)
    const accessToken = jwt.sign(
      { id: user.id, role: user.role, email: user.email }, 
      process.env.JWT_ACCESS_SECRET!, 
      { expiresIn: '15m' }
    );

    // Generate a long-lived refresh token (expires in 7 days)
    const refreshToken = jwt.sign(
      { id: user.id }, 
      process.env.JWT_REFRESH_SECRET!, 
      { expiresIn: '7d' }
    );

    // Send the refresh token as a secure, HTTP-only cookie to prevent XSS attacks
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ 
      status: 'success', 
      data: { accessToken, role: user.role, userId: user.id } 
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', error: 'Internal authentication subsystem failure.' });
  }
};

export const refreshSession = async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;
  
  if (!refreshToken) {
    return res.status(401).json({ status: 'error', error: 'Refresh token verification payload absent.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string };
    const checkUser = await pool.query('SELECT id, role, email FROM users WHERE id = $1', [decoded.id]);
    
    if (checkUser.rowCount === 0) {
      return res.status(401).json({ status: 'error', error: 'Active user context no longer maps to platform registries.' });
    }

    const user = checkUser.rows[0];
    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role, email: user.email }, 
      process.env.JWT_ACCESS_SECRET!, 
      { expiresIn: '15m' }
    );
    
    return res.json({ status: 'success', data: { accessToken: newAccessToken } });
  } catch (err) {
    return res.status(403).json({ status: 'error', error: 'Stale or corrupted refresh signature context.' });
  }
};