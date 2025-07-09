import mongoose from 'mongoose'

const userSessionSchema = new mongoose.Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    state: {
      type: String,
      enum: [
        'idle',
        'awaiting_amount',
        'awaiting_mobile',
        'awaiting_withdrawal_amount',
        'awaiting_account_name',
        'awaiting_account_number',
        'awaiting_bank_choice',
        'awaiting_bank_confirmation',
        'processing_payment',
        'processing_withdrawal',
      ],
      default: 'idle',
    },
    paymentData: {
      amount: String,
      mobile: String,
      reference: String,
    },
    withdrawalData: {
      amount: String,
      accountName: String,
      accountNumber: String,
      bankCode: Number,
      bankName: String,
    },
    context: {
      lastCommand: String,
      lastMessageId: Number,
      lastMenuMessageId: Number,
      conversationStep: Number,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Index for cleanup
userSessionSchema.index({ expiresAt: 1 })
userSessionSchema.index({ isActive: 1, expiresAt: 1 })

// Method to extend session
userSessionSchema.methods.extendSession = async function () {
  this.expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  return await this.save()
}

// Method to clear session
userSessionSchema.methods.clearSession = async function () {
  this.state = 'idle'
  this.paymentData = {}
  this.withdrawalData = {}
  this.context = {}
  this.isActive = false
  return await this.save()
}

// Method to update state
userSessionSchema.methods.updateState = async function (
  newState: string,
  data?: any,
) {
  this.state = newState
  this.isActive = true

  if (data) {
    if (data.paymentData) this.paymentData = data.paymentData
    if (data.withdrawalData) this.withdrawalData = data.withdrawalData
    if (data.context) this.context = data.context
  }

  return await this.extendSession()
}

// Static method to get or create session
userSessionSchema.statics.getOrCreateSession = async function (
  telegramId: number,
) {
  let session = await this.findOne({ telegramId })

  if (!session) {
    session = new this({ telegramId })
    await session.save()
  } else if (!session.isActive || session.expiresAt < new Date()) {
    // Reactivate expired session
    session.isActive = true
    await session.extendSession()
  }

  return session
}

// Static method to cleanup expired sessions
userSessionSchema.statics.cleanupExpiredSessions = async function () {
  const result = await this.updateMany(
    { expiresAt: { $lt: new Date() }, isActive: true },
    { isActive: false },
  )
  return result.modifiedCount
}

// Static method to get active sessions count
userSessionSchema.statics.getActiveSessionsCount = async function () {
  return await this.countDocuments({ isActive: true })
}

// Define interfaces
interface IUserSession extends mongoose.Document {
  telegramId: number
  state: string
  paymentData?: {
    amount?: string
    mobile?: string
    reference?: string
  }
  withdrawalData?: {
    amount?: string
    accountName?: string
    accountNumber?: string
    bankCode?: number
    bankName?: string
  }
  context?: {
    lastCommand?: string
    lastMessageId?: number
    lastMenuMessageId?: number
    conversationStep?: number
  }
  expiresAt: Date
  isActive: boolean
  extendSession(): Promise<IUserSession>
  clearSession(): Promise<IUserSession>
  updateState(newState: string, data?: any): Promise<IUserSession>
}

interface IUserSessionModel extends mongoose.Model<IUserSession> {
  getOrCreateSession(telegramId: number): Promise<IUserSession>
  cleanupExpiredSessions(): Promise<number>
  getActiveSessionsCount(): Promise<number>
}

const UserSession = mongoose.model<IUserSession, IUserSessionModel>(
  'UserSession',
  userSessionSchema,
)

export default UserSession
export type { IUserSession, IUserSessionModel }
