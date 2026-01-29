const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../models/db'); // Ensure you have this model available

// Verifies JWT and attaches payload to req.user
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    // Supabase JWT `sub` is the user UUID.
    // Fetch user roles from public.users (or wherever you store them).
    // Adjust the query based on your actual schema.
    try {
      /*
      // Example query if roles are in a jsonb column or joined table
      const userResult = await db.query(
          `SELECT u.id, u.email, u.full_name, 
                  COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]') as roles
           FROM users u
           LEFT JOIN user_roles ur ON ur.user_id = u.id
           LEFT JOIN roles r ON r.id = ur.role_id
           WHERE u.id = $1
           GROUP BY u.id`,
          [decoded.sub]
      );
      */

      // For migration stability, I will assume a simpler query or just passing the ID if tables aren't set up yet.
      // But the user asked to "edit the code... to match with firebase (Supabase) things".
      // I will assume the 'users' table exists as per the plan.

      const userResult = await db.query('SELECT * FROM users WHERE id = $1', [decoded.sub]);
      const user = userResult.rows[0];

      if (user) {
        // If you have a separate roles table/logic, add it here.
        // For now, attaching the Supabase sub as the ID and any found user data.
        req.user = {
          ...decoded,
          id: decoded.sub,
          ...user,
          roles: user.roles || [] // Assuming roles might be a column or we need to join. 
        };
      } else {
        // User might be in Auth but not in Public yet (race condition or trigger failed)
        req.user = { ...decoded, id: decoded.sub };
      }

    } catch (dbError) {
      console.error('Error fetching user details:', dbError);
      // Fallback to just the token data
      req.user = { ...decoded, id: decoded.sub };
    }

    return next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;

