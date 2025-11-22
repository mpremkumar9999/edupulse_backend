import mongoose from 'mongoose'

const reportSchema = new mongoose.Schema({
  type: { type: String, required: true },
  data: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.model('Report', reportSchema)
