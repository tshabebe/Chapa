import axios from 'axios'
import Withdrawal from '../models/Withdrawal.js'
import { BalanceService } from './BalanceService.js'
import { logger } from '../utils/logger.js'

const CHAPA_AUTH_KEY = process.env.CHAPA_AUTH_KEY

export interface BankInfo {
  id: number
  name: string
  code: string
}

export interface WithdrawalRequest {
  amount: number
  accountName: string
  accountNumber: string
  bankCode: number
  bankName: string
  userId?: string
}

export class WithdrawalService {
  // Get available banks from Chapa
  static async getBanks(): Promise<BankInfo[]> {
    try {
      const response = await axios.get('https://api.chapa.co/v1/banks', {
        headers: {
          Authorization: `Bearer ${CHAPA_AUTH_KEY}`,
          'Content-Type': 'application/json',
        },
      })

      return response.data.data || []
    } catch (error: any) {
      logger.error('❌ Error fetching banks:', error.message)
      throw new Error('Failed to fetch banks')
    }
  }

  // Check if user has sufficient balance
  static async checkBalance(userId: string, amount: number): Promise<boolean> {
    try {
      return await BalanceService.checkBalance(userId, amount)
    } catch (error: any) {
      logger.error('❌ Error checking balance:', error.message)
      return false
    }
  }

  // Initiate withdrawal
  static async initiateWithdrawal(request: WithdrawalRequest): Promise<any> {
    const { amount, accountName, accountNumber, bankCode, bankName, userId } =
      request

    if (!userId) {
      throw new Error('User ID is required')
    }

    try {
      // Check balance
      const hasSufficientBalance = await this.checkBalance(userId, amount)
      if (!hasSufficientBalance) {
        throw new Error('Insufficient balance')
      }

      // Create withdrawal record
      const reference = `withdrawal-${userId}-${Date.now()}`
      const withdrawal = new Withdrawal({
        userId,
        amount,
        currency: 'ETB',
        accountName,
        accountNumber,
        bankCode,
        bankName,
        reference,
        status: 'pending',
      })

      await withdrawal.save()

      // Initiate transfer with Chapa
      const transferPayload = {
        account_name: accountName,
        account_number: accountNumber,
        amount: amount.toString(),
        currency: 'ETB',
        reference: reference,
        bank_code: bankCode,
      }

      logger.info('📤 Initiating transfer with Chapa:', transferPayload)

      const response = await axios.post(
        'https://api.chapa.co/v1/transfers',
        transferPayload,
        {
          headers: {
            Authorization: `Bearer ${CHAPA_AUTH_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      )

      logger.info('✅ Chapa transfer response:', response.data)

      if (response.data.status === 'success') {
        // Update withdrawal status
        await withdrawal.updateStatus('processing', response.data.data?.id)

        // Deduct from balance
        await BalanceService.decrementBalance(userId, amount)

        logger.info('💰 Balance deducted by:', { amount })
      } else {
        await withdrawal.updateStatus(
          'failed',
          undefined,
          'Transfer initiation failed',
        )
        throw new Error('Transfer initiation failed')
      }

      return withdrawal
    } catch (error: any) {
      logger.error('❌ Withdrawal error:', error.message)
      throw error
    }
  }

  // Verify withdrawal status
  static async verifyWithdrawal(reference: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.chapa.co/v1/transfers/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${CHAPA_AUTH_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      )

      logger.info('✅ Transfer verification response:', response.data)

      // Update withdrawal status based on response
      const withdrawal = await Withdrawal.findOne({ reference })
      if (withdrawal) {
        const status = response.data.data?.status || 'pending'
        await withdrawal.updateStatus(status)
      }

      return response.data
    } catch (error: any) {
      logger.error('❌ Transfer verification error:', error.message)
      throw error
    }
  }

  // Get user's withdrawal history
  static async getWithdrawalHistory(userId: string): Promise<any[]> {
    try {
      return await Withdrawal.find({ userId }).sort({ createdAt: -1 }).limit(10)
    } catch (error: any) {
      logger.error('❌ Error fetching withdrawal history:', error.message)
      return []
    }
  }

  // Get withdrawal by reference
  static async getWithdrawalByReference(
    reference: string,
  ): Promise<any | null> {
    try {
      return await Withdrawal.findOne({ reference })
    } catch (error: any) {
      logger.error('❌ Error fetching withdrawal:', error.message)
      return null
    }
  }

  // Create withdrawal (alias for initiateWithdrawal for backward compatibility)
  static async createWithdrawal(
    userId: string,
    amount: number,
    accountName: string,
    accountNumber: string,
    bankCode: number,
    bankName: string,
  ) {
    const request: WithdrawalRequest = {
      amount,
      accountName,
      accountNumber,
      bankCode,
      bankName,
      userId,
    }
    return this.initiateWithdrawal(request)
  }
}
