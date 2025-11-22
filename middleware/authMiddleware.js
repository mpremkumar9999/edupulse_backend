import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const protect = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]

      // ✅ DEBUG LOG — this will show you the decoded token payload
      console.log("🔹 Incoming token:", req.headers.authorization);

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      console.log('Decoded token:', decoded)

      // ✅ Use either decoded.id OR decoded._id — we’ll confirm which is correct
      req.user = await User.findById(decoded.id || decoded._id).select('-password')

      if (!req.user) {
        console.log('⚠️ User not found for decoded token:', decoded)
        return res.status(404).json({ message: 'User not found' })
      }

      next()
    } catch (error) {
      console.error('❌ JWT verification failed:', error.message)
      res.status(401).json({ message: 'Invalid or expired token' })
    }
  } else {
    console.warn('🚫 No token provided in headers')
    res.status(401).json({ message: 'No token provided' })
  }
}
