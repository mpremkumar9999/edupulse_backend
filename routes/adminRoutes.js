import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'
import { getFacultyStats, assignReward } from '../controllers/adminController.js'

const router = express.Router()

router.get('/faculty-stats', protect, authorizeRoles('Admin'), getFacultyStats)
router.post('/assign-reward', protect, authorizeRoles('Admin'), assignReward)

export default router
