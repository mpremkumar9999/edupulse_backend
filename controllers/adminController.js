import Feedback from '../models/Feedback.js'
import Reward from '../models/Reward.js'

export const getFacultyStats = async (req, res) => {
  try {
    const stats = await Feedback.aggregate([
      { $group: { _id: '$faculty', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ])
    res.json(stats)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const assignReward = async (req, res) => {
  try {
    const { studentId, points, reason } = req.body
    const reward = await Reward.create({ student: studentId, points, reason })
    res.status(201).json(reward)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
