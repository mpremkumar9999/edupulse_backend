import Feedback from '../models/Feedback.js'
import User from '../models/User.js'

// Submit feedback
export const submitFeedback = async (req, res) => {
  try {
    const { facultyId, subject, rating, comments, isAnonymous } = req.body
    const studentId = req.user.id // From auth middleware

    // Validate required fields
    if (!facultyId || !subject || !rating || !comments) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      })
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      })
    }

    const student = await User.findById(studentId)
    const faculty = await User.findById(facultyId)

    if (!faculty || faculty.role !== 'Faculty') {
      return res.status(404).json({ 
        success: false,
        message: 'Faculty not found' 
      })
    }

    if (!student || student.role !== 'Student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      })
    }

    // Check if student has already submitted feedback for this faculty and subject
    const existingFeedback = await Feedback.findOne({
      studentId,
      facultyId,
      subject
    })

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted feedback for this faculty and subject'
      })
    }

    const feedback = new Feedback({
      studentId,
      studentName: isAnonymous ? 'Anonymous' : student.name,
      facultyId,
      facultyName: faculty.name,
      subject,
      rating,
      comments,
      isAnonymous
    })

    await feedback.save()

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully!',
      feedback: {
        _id: feedback._id,
        facultyName: feedback.facultyName,
        subject: feedback.subject,
        rating: feedback.rating,
        comments: feedback.comments,
        isAnonymous: feedback.isAnonymous,
        createdAt: feedback.createdAt
      }
    })

  } catch (err) {
    console.error('❌ Submit feedback error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error submitting feedback' 
    })
  }
}

// Get feedback for faculty
export const getFacultyFeedback = async (req, res) => {
  try {
    const { facultyId } = req.params

    // Verify faculty exists
    const faculty = await User.findById(facultyId)
    if (!faculty || faculty.role !== 'Faculty') {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      })
    }

    const feedbacks = await Feedback.find({ facultyId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'studentId',
        select: 'name className profilePic email',
        model: 'User'
      })

    // Transform the data to ensure consistent structure
    const transformedFeedbacks = feedbacks.map(feedback => ({
      _id: feedback._id,
      studentId: feedback.studentId,
      studentName: feedback.isAnonymous ? 'Anonymous Student' : (feedback.studentName || feedback.studentId?.name),
      facultyId: feedback.facultyId,
      facultyName: feedback.facultyName,
      subject: feedback.subject,
      rating: feedback.rating,
      comments: feedback.comments,
      isAnonymous: feedback.isAnonymous,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt
    }))

    res.json({
      success: true,
      feedbacks: transformedFeedbacks,
      total: transformedFeedbacks.length,
      averageRating: transformedFeedbacks.length > 0 
        ? (transformedFeedbacks.reduce((sum, fb) => sum + fb.rating, 0) / transformedFeedbacks.length).toFixed(1)
        : 0
    })

  } catch (err) {
    console.error('❌ Get faculty feedback error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching feedback' 
    })
  }
}

// Get feedback by student
export const getStudentFeedback = async (req, res) => {
  try {
    const studentId = req.user.id // From auth middleware

    const feedbacks = await Feedback.find({ studentId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'facultyId',
        select: 'name subjects profilePic',
        model: 'User'
      })

    res.json({
      success: true,
      feedbacks,
      total: feedbacks.length
    })

  } catch (err) {
    console.error('❌ Get student feedback error:', err)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching feedback' 
    })
  }
}

// Get feedback statistics for faculty
export const getFeedbackStatistics = async (req, res) => {
  try {
    const { facultyId } = req.params

    const feedbacks = await Feedback.find({ facultyId })
    
    if (feedbacks.length === 0) {
      return res.json({
        success: true,
        statistics: {
          total: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          anonymousCount: 0,
          nonAnonymousCount: 0
        }
      })
    }

    const total = feedbacks.length
    const averageRating = (feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / total).toFixed(1)
    
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    feedbacks.forEach(fb => {
      ratingDistribution[fb.rating]++
    })

    const anonymousCount = feedbacks.filter(fb => fb.isAnonymous).length
    const nonAnonymousCount = total - anonymousCount

    res.json({
      success: true,
      statistics: {
        total,
        averageRating,
        ratingDistribution,
        anonymousCount,
        nonAnonymousCount
      }
    })

  } catch (err) {
    console.error('❌ Get feedback statistics error:', err)
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback statistics'
    })
  }
}

// Delete feedback (for students)
export const deleteFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params
    const studentId = req.user.id

    const feedback = await Feedback.findOne({ _id: feedbackId, studentId })

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      })
    }

    await Feedback.findByIdAndDelete(feedbackId)

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    })

  } catch (err) {
    console.error('❌ Delete feedback error:', err)
    res.status(500).json({
      success: false,
      message: 'Error deleting feedback'
    })
  }
}