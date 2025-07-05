import mongoose from 'mongoose'

const balanceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      default: 'default-user', // Single user for now
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'ETB',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Method to increment balance
balanceSchema.methods.incrementBalance = async function (amount: number) {
  this.balance += amount
  this.lastUpdated = new Date()
  return await this.save()
}

// Static method to get or create balance
balanceSchema.statics.getOrCreateBalance = async function (
  userId: string = 'default-user',
) {
  let balance = await this.findOne({ userId })

  if (!balance) {
    balance = new this({ userId })
    await balance.save()
  }

  return balance
}

const Balance = mongoose.model('Balance', balanceSchema)

export default Balance
