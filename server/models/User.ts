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
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Index for performance
userSchema.index({ lastActivity: -1 })
userSchema.index({ isActive: 1 })

// Method to update last activity
userSchema.methods.updateActivity = async function () {
  this.lastActivity = new Date()
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

// Define interfaces
interface IUser extends mongoose.Document {
  telegramId: number
  username?: string
  firstName: string
  lastName?: string
  isActive: boolean
  lastActivity: Date
  registrationDate: Date
  updateActivity(): Promise<IUser>
}

interface IUserModel extends mongoose.Model<IUser> {
  getOrCreateUser(userData: {
    telegramId: number
    username?: string
    firstName: string
    lastName?: string
  }): Promise<IUser>
}

const User = mongoose.model<IUser, IUserModel>('User', userSchema)

export default User
export type { IUser, IUserModel }
