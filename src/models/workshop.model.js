const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const sessionSchema = mongoose.Schema(
  {
    workshop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workshop',
      required: true,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // Duration in minutes
      required: true,
      min: 1,
    },
    maxParticipants: {
      type: Number,
      required: true,
      min: 1,
      default: 10,
    },
    currentParticipants: {
      type: Number,
      default: 0,
      min: 0,
    },
    reservations: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      reservedAt: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ['confirmed', 'cancelled', 'attended', 'no-show'],
        default: 'confirmed',
      },
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const workshopSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String, // Host of the workshop
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for sessions
workshopSchema.virtual('sessions', {
  ref: 'Session',
  localField: '_id',
  foreignField: 'workshop',
});

// Virtual for total participants across all sessions
workshopSchema.virtual('totalParticipants').get(function() {
  if (this.sessions) {
    return this.sessions.reduce((total, session) => total + session.currentParticipants, 0);
  }
  return 0;
});

// Session methods
sessionSchema.methods.addReservation = async function(userId) {
  if (this.currentParticipants >= this.maxParticipants) {
    throw new Error('Session is fully booked');
  }
  
  // Check if user already has a reservation
  const existingReservation = this.reservations.find(
    reservation => reservation.user.toString() === userId.toString() && reservation.status === 'confirmed'
  );
  
  if (existingReservation) {
    throw new Error('User already has a reservation for this session');
  }
  
  this.reservations.push({
    user: userId,
    status: 'confirmed'
  });
  
  this.currentParticipants += 1;
  await this.save();
  return this;
};

sessionSchema.methods.cancelReservation = async function(userId) {
  const reservationIndex = this.reservations.findIndex(
    reservation => reservation.user.toString() === userId.toString() && reservation.status === 'confirmed'
  );
  
  if (reservationIndex === -1) {
    throw new Error('No confirmed reservation found for this user');
  }
  
  this.reservations[reservationIndex].status = 'cancelled';
  this.currentParticipants = Math.max(0, this.currentParticipants - 1);
  await this.save();
  return this;
};

sessionSchema.methods.markAttendance = async function(userId, attended = true) {
  const reservation = this.reservations.find(
    reservation => reservation.user.toString() === userId.toString() && reservation.status === 'confirmed'
  );
  
  if (!reservation) {
    throw new Error('No confirmed reservation found for this user');
  }
  
  reservation.status = attended ? 'attended' : 'no-show';
  await this.save();
  return this;
};

// Workshop methods
workshopSchema.methods.addSession = async function(sessionData) {
  const Session = mongoose.model('Session');
  const session = new Session({
    ...sessionData,
    workshop: this._id
  });
  await session.save();
  return session;
};

workshopSchema.methods.getAvailableSessions = async function() {
  const Session = mongoose.model('Session');
  return await Session.find({
    workshop: this._id,
    isActive: true,
    dateTime: { $gte: new Date() },
    $expr: { $lt: ['$currentParticipants', '$maxParticipants'] }
  }).sort({ dateTime: 1 });
};

workshopSchema.methods.getAllSessions = async function() {
  const Session = mongoose.model('Session');
  return await Session.find({
    workshop: this._id
  }).sort({ dateTime: 1 });
};

// Indexes
sessionSchema.index({ workshop: 1, dateTime: 1 });
sessionSchema.index({ 'reservations.user': 1 });
workshopSchema.index({ title: 'text', description: 'text' });
workshopSchema.index({ category: 1 });
workshopSchema.index({ isActive: 1 });

// Add plugins
sessionSchema.plugin(toJSON);
sessionSchema.plugin(paginate);
workshopSchema.plugin(toJSON);
workshopSchema.plugin(paginate);

// Ensure virtuals are included in JSON
workshopSchema.set('toJSON', { virtuals: true });
workshopSchema.set('toObject', { virtuals: true });

/**
 * @typedef Workshop
 */
const Workshop = mongoose.model('Workshop', workshopSchema);

/**
 * @typedef Session
 */
const Session = mongoose.model('Session', sessionSchema);

module.exports = { Workshop, Session };
