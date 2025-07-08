import mongoose from 'mongoose'

const withdrawalSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      default: 'default-user',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'ETB',
    },
    accountName: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    bankCode: {
      type: Number,
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'reverted'],
      default: 'pending',
    },
    chapaTransferId: {
      type: String,
    },
    errorMessage: {
      type: String,
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Method to update status
withdrawalSchema.methods.updateStatus = async function (
  status: string,
  chapaTransferId?: string,
  errorMessage?: string,
) {
  this.status = status
  if (chapaTransferId) this.chapaTransferId = chapaTransferId
  if (errorMessage) this.errorMessage = errorMessage
  if (status === 'completed' || status === 'failed') {
    this.processedAt = new Date()
  }
  return await this.save()
}

// Define the interface for the Withdrawal document
interface IWithdrawal extends mongoose.Document {
  userId: string
  amount: number
  currency: string
  accountName: string
  accountNumber: string
  bankCode: number
  bankName: string
  reference: string
  status: string
  chapaTransferId?: string
  errorMessage?: string
  processedAt?: Date
  updateStatus(
    status: string,
    chapaTransferId?: string,
    errorMessage?: string,
  ): Promise<IWithdrawal>
}

const Withdrawal = mongoose.model<IWithdrawal>('Withdrawal', withdrawalSchema)

export default Withdrawal
