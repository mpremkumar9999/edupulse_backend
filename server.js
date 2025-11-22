import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import connectDB from './config/db.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import http from 'http'

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './routes/authRoutes.js'
import feedbackRoutes from './routes/feedbackRoutes.js'
import timetableRoutes from './routes/timetableRoutes.js'

import userRoutes from './routes/userRoutes.js'
import assignmentRoutes from './routes/assignmentRoutes.js'
import submissionRoutes from './routes/submissionRoutes.js'
import attendanceRoutes from './routes/attendanceRoutes.js'

import adminRoutes from './routes/admin.js'
import contentRoutes from './routes/contentRoutes.js'

dotenv.config()
connectDB()

const app = express()

// ✅ FIXED CORS CONFIGURATION
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

app.use(express.json())

// ✅ FIXED: Serve static files with absolute path
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ✅ CREATE HTTP SERVER for WebSockets
const server = http.createServer(app);

// ✅ IMPORT AND SETUP SOCKET HANDLERS - ONLY ONCE!
import setupSocketHandlers from './websocket/socketHandlers.js'
setupSocketHandlers(server)

// Debug route to check if server is working
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  })
})

// Test Socket.IO endpoint
app.get('/api/socket-test', (req, res) => {
  res.json({ 
    message: 'Socket.IO server should be available at /socket.io/',
    socketPath: '/socket.io/'
  })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/timetable', timetableRoutes)
//app.use('/api/admin', adminRoutes)
app.use('/api/users', userRoutes)
app.use('/api/assignments', assignmentRoutes)
app.use('/api/submissions', submissionRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/content', contentRoutes)


app.get('/', (req, res) => res.send('EduPulse API is running...'))

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📁 Current directory: ${__dirname}`)
  console.log(`🖼️ Static files served from: ${path.join(__dirname, 'uploads')}`)
  console.log(`🔌 WebSockets enabled on port ${PORT}`)
  console.log(`🌐 CORS enabled for: http://localhost:3000, http://localhost:5173`)
})