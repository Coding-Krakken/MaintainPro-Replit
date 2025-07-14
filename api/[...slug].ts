import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple mock data for demo purposes
const mockProfile = {
  id: 'demo-user',
  email: 'demo@maintainpro.com',
  firstName: 'Demo',
  lastName: 'User',
  role: 'supervisor',
  warehouseId: 'demo-warehouse',
  active: true,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query;
  const path = Array.isArray(slug) ? `/${slug.join('/')}` : `/${slug}`;

  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id, x-warehouse-id');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Handle API routes
    if (path === '/profiles/me' || path.startsWith('/profiles/')) {
      return res.status(200).json(mockProfile);
    }

    if (path.startsWith('/work-orders')) {
      return res.status(200).json([]);
    }

    if (path.startsWith('/equipment')) {
      return res.status(200).json([]);
    }

    if (path.startsWith('/parts')) {
      return res.status(200).json([]);
    }

    if (path.startsWith('/notifications')) {
      return res.status(200).json([]);
    }

    // Default response for unknown routes
    return res.status(404).json({ message: 'API route not found' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
