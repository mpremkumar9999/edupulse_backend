import mongoose from 'mongoose'

const rewardSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  points: { type: Number, default: 0 },
  reason: { type: String },
  date: { type: Date, default: Date.now },
})

export default mongoose.model('Reward', rewardSchema)
