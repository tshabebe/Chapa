import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      sparse: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    preferences: {
      language: {
        type: String,
        default: 'en',
        enum: ['en', 'am'],
      },
      notifications: {
        type: Boolean,
        default: true,
      },
    },
    statistics: {
      totalPayments: {
        type: Number,
        default: 0,
      },
      totalWithdrawals: {
        type: Number,
        default: 0,
      },
      totalAmountPaid: {
        type: Number,
        default: 0,
      },
      totalAmountWithdrawn: {
        type: Number,
        default: 0,
      },
      lastPaymentDate: Date,
      lastWithdrawalDate: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Index for performance
userSchema.index({ lastActivity: -1 })
userSchema.index({ isActive: 1, isBlocked: 1 })

// Method to update last activity
userSchema.methods.updateActivity = async function () {
  this.lastActivity = new Date()
  return await this.save()
}

// Method to block/unblock user
userSchema.methods.toggleBlock = async function () {
  this.isBlocked = !this.isBlocked
  return await this.save()
}

// Method to update statistics
userSchema.methods.updatePaymentStats = async function (amount: number) {
  this.statistics.totalPayments += 1
  this.statistics.totalAmountPaid += amount
  this.statistics.lastPaymentDate = new Date()
  return await this.save()
}

userSchema.methods.updateWithdrawalStats = async function (amount: number) {
  this.statistics.totalWithdrawals += 1
  this.statistics.totalAmountWithdrawn += amount
  this.statistics.lastWithdrawalDate = new Date()
  return await this.save()
}

// Static method to get or create user
userSchema.statics.getOrCreateUser = async function (userData: {
  telegramId: number
  username?: string
  firstName: string
  lastName?: string
}) {
  let user = await this.findOne({ telegramId: userData.telegramId })

  if (!user) {
    user = new this(userData)
    await user.save()
  } else {
    // Update user info if changed
    user.username = userData.username
    user.firstName = userData.firstName
    user.lastName = userData.lastName
    user.lastActivity = new Date()
    await user.save()
  }

  return user
}

// Static method to get active users
userSchema.statics.getActiveUsers = async function () {
  return await this.find({ isActive: true, isBlocked: false })
}

// Static method to get inactive users (for cleanup)
userSchema.statics.getInactiveUsers = async function (
  daysInactive: number = 30,
) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive)

  return await this.find({
    lastActivity: { $lt: cutoffDate },
    isActive: true,
  })
}

// Define interfaces
interface IUser extends mongoose.Document {
  telegramId: number
  username?: string
  firstName: string
  lastName?: string
  isActive: boolean
  isBlocked: boolean
  lastActivity: Date
  registrationDate: Date
  preferences: {
    language: string
    notifications: boolean
  }
  statistics: {
    totalPayments: number
    totalWithdrawals: number
    totalAmountPaid: number
    totalAmountWithdrawn: number
    lastPaymentDate?: Date
    lastWithdrawalDate?: Date
  }
  updateActivity(): Promise<IUser>
  toggleBlock(): Promise<IUser>
  updatePaymentStats(amount: number): Promise<IUser>
  updateWithdrawalStats(amount: number): Promise<IUser>
}

interface IUserModel extends mongoose.Model<IUser> {
  getOrCreateUser(userData: {
    telegramId: number
    username?: string
    firstName: string
    lastName?: string
  }): Promise<IUser>
  getActiveUsers(): Promise<IUser[]>
  getInactiveUsers(daysInactive?: number): Promise<IUser[]>
}

const User = mongoose.model<IUser, IUserModel>('User', userSchema)

export default User
export type { IUser, IUserModel }
