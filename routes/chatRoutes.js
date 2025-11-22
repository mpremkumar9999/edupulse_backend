import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Message from '../models/Message.js';

const router = express.Router();

// Get all users for chat (excluding current user)
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('name role className profilePic email isOnline lastSeen')
      .sort({ name: 1 });
    
    res.json(users);
  } catch (error) {
    console.error('Get chat users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's conversations (people they've chatted with)
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { from: req.user._id },
            { to: req.user._id }
          ],
          messageType: 'private'
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$from', req.user._id] },
              '$to',
              '$from'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$to', req.user._id] },
                    { $not: { $in: [req.user._id, '$readBy.user'] } }
                  ]
                },
                1,
                0
              ]
            }
          },
          totalMessages: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          'user._id': 1,
          'user.name': 1,
          'user.role': 1,
          'user.profilePic': 1,
          'user.className': 1,
          'user.email': 1,
          'user.isOnline': 1,
          'user.lastSeen': 1,
          lastMessage: 1,
          unreadCount: 1,
          totalMessages: 1
        }
      },
      {
        $sort: { 'lastMessage.timestamp': -1 }
      }
    ]);

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;