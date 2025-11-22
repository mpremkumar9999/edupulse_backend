import mongoose from 'mongoose'

const timetableSchema = new mongoose.Schema({
  facultyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  facultyName: { 
    type: String, 
    required: true 
  },
  day: { 
    type: String, 
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true 
  },
  timeSlot: { 
    type: String, 
    required: true 
  },
  startTime: { 
    type: String, 
    required: true 
  },
  endTime: { 
    type: String, 
    required: true 
  },
  subject: { 
    type: String, 
    required: true 
  },
  className: { 
    type: String, 
    required: true 
  },
  room: { 
    type: String, 
    default: '' 
  },
  isBreak: { 
    type: Boolean, 
    default: false 
  },
  breakType: { 
    type: String, 
    enum: ['Short Break', 'Lunch Break', 'Tea Break', ''],
    default: '' 
  }
}, { timestamps: true })

export default mongoose.model('Timetable', timetableSchema)