import { storage } from "../../storage";

export const authenticateToken = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const session = await storage.getSessionByToken(token);
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Token validation failed' });
  }
};