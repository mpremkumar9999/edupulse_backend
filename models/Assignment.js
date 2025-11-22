import mongoose from 'mongoose'

// ✅ Define valid class names
const validClassNames = [
  'E1 CSE-A', 'E1 CSE-B', 'E1 CSE-C', 'E1 CSE-D',
  'E2 CSE-A', 'E2 CSE-B', 'E2 CSE-C', 'E2 CSE-D',
  'E3 CSE-A', 'E3 CSE-B', 'E3 CSE-C', 'E3 CSE-D',
  'E4 CSE-A', 'E4 CSE-B', 'E4 CSE-C', 'E4 CSE-D'
]

// ✅ Assignment Schema
const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    className: {
      type: String,
      enum: validClassNames,
      required: true
    },
    fileUrl: { type: String, default: '' },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
)

export default mongoose.model('Assignment', assignmentSchema)
