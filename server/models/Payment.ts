import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: Number, // Telegram user ID
      required: true,
      index: true,
    },
    tx_ref: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'ETB',
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
    },
    chapaReference: {
      type: String,
    },
    metadata: {
      phoneNumber: String,
      email: String,
      firstName: String,
      lastName: String,
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Index for performance
paymentSchema.index({ userId: 1, status: 1 })
paymentSchema.index({ createdAt: -1 })

// Method to mark payment as successful
paymentSchema.methods.markSuccess = async function (chapaReference?: string) {
  this.status = 'success'
  this.chapaReference = chapaReference
  this.processedAt = new Date()
  return await this.save()
}

// Method to mark payment as failed
paymentSchema.methods.markFailed = async function () {
  this.status = 'failed'
  this.processedAt = new Date()
  return await this.save()
}

// Static method to create payment
paymentSchema.statics.createPayment = async function (paymentData: {
  userId: number
  tx_ref: string
  amount: number
  currency?: string
  metadata?: {
    phoneNumber?: string
    email?: string
    firstName?: string
    lastName?: string
  }
}) {
  const payment = new this(paymentData)
  return await payment.save()
}

// Static method to find payment by tx_ref
paymentSchema.statics.findByTxRef = async function (tx_ref: string) {
  return await this.findOne({ tx_ref })
}

// Static method to get user payments
paymentSchema.statics.getUserPayments = async function (
  userId: number,
  limit = 10,
) {
  return await this.find({ userId }).sort({ createdAt: -1 }).limit(limit)
}

// Define interfaces
interface IPayment extends mongoose.Document {
  userId: number
  tx_ref: string
  amount: number
  currency: string
  status: string
  paymentMethod?: string
  chapaReference?: string
  metadata?: {
    phoneNumber?: string
    email?: string
    firstName?: string
    lastName?: string
  }
  processedAt?: Date
  markSuccess(chapaReference?: string): Promise<IPayment>
  markFailed(): Promise<IPayment>
}

interface IPaymentModel extends mongoose.Model<IPayment> {
  createPayment(paymentData: {
    userId: number
    tx_ref: string
    amount: number
    currency?: string
    metadata?: {
      phoneNumber?: string
      email?: string
      firstName?: string
      lastName?: string
    }
  }): Promise<IPayment>
  findByTxRef(tx_ref: string): Promise<IPayment | null>
  getUserPayments(userId: number, limit?: number): Promise<IPayment[]>
}

const Payment = mongoose.model<IPayment, IPaymentModel>(
  'Payment',
  paymentSchema,
)

export default Payment
export type { IPayment, IPaymentModel }
