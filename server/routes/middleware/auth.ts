import { storage } from "../../storage";

export const authenticateToken = async (req: any, res: any, next: any) => {
  console.log('Auth middleware - headers:', req.headers);
  const token = req.headers.authorization?.replace('Bearer ', '');
  console.log('Auth middleware - token:', token ? 'present' : 'missing');
  
  if (!token) {
    console.log('Auth middleware - no token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const session = await storage.getSessionByToken(token);
    console.log('Auth middleware - session:', session ? 'found' : 'not found');
    if (!session || session.expiresAt < new Date()) {
      console.log('Auth middleware - invalid or expired session');
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = await storage.getUser(session.userId);
    console.log('Auth middleware - user:', user ? 'found' : 'not found');
    if (!user) {
      console.log('Auth middleware - user not found');
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    console.log('Auth middleware - authentication successful for user:', user.username);
    next();
  } catch (error) {
    console.error('Auth middleware - error:', error);
    res.status(500).json({ message: 'Token validation failed' });
  }
};