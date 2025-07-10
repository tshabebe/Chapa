import type { Request, Response } from 'express'
import { WithdrawalService } from '../services/withdrawalService.js'
import { BalanceService } from '../services/BalanceService.js'
import { logger } from '../utils/logger.js'

export class WithdrawalController {
  // Initiate withdrawal
  static async initiateWithdrawal(req: Request, res: Response) {
    try {
      const {
        amount,
        accountName,
        accountNumber,
        bankCode,
        bankName,
        userId, // Require userId
      } = req.body

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        })
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required',
        })
      }

      if (!accountName || !accountNumber || !bankCode || !bankName) {
        return res.status(400).json({
          success: false,
          message: 'All bank details are required',
        })
      }

      logger.info(
        `💰 Initiating withdrawal for user: ${userId}, amount: ${amount}`,
      )

      const withdrawal = await WithdrawalService.initiateWithdrawal({
        amount,
        accountName,
        accountNumber,
        bankCode,
        bankName,
        userId,
      })

      res.status(200).json({
        success: true,
        message: 'Withdrawal initiated successfully',
        data: withdrawal,
      })
    } catch (error: any) {
      logger.error('❌ Withdrawal initiation error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Withdrawal initiation failed',
        error: error.message,
      })
    }
  }

  // Verify withdrawal status
  static async verifyWithdrawal(req: Request, res: Response) {
    try {
      const { reference } = req.params

      if (!reference) {
        return res.status(400).json({
          success: false,
          message: 'Withdrawal reference is required',
        })
      }

      logger.info('🔍 Verifying withdrawal:', reference)
      const verificationResult = await WithdrawalService.verifyWithdrawal(
        reference,
      )

      res.status(200).json({
        success: true,
        message: 'Withdrawal verification completed',
        data: verificationResult,
      })
    } catch (error: any) {
      logger.error('❌ Withdrawal verification error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Withdrawal verification failed',
        error: error.message,
      })
    }
  }

  // Get withdrawal history
  static async getWithdrawalHistory(req: Request, res: Response) {
    try {
      const userId = req.params.userId || (req.query.userId as string)

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        })
      }

      logger.info('📋 Getting withdrawal history for user:', userId)
      const history = await WithdrawalService.getWithdrawalHistory(userId)

      res.status(200).json({
        success: true,
        message: 'Withdrawal history retrieved successfully',
        data: {
          userId,
          withdrawals: history,
        },
      })
    } catch (error: any) {
      logger.error('❌ Get withdrawal history error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to get withdrawal history',
        error: error.message,
      })
    }
  }

  // Get available banks
  static async getBanks(req: Request, res: Response) {
    try {
      logger.info('🏦 Getting available banks')
      const banks = await WithdrawalService.getBanks()

      res.status(200).json({
        success: true,
        message: 'Banks retrieved successfully',
        data: banks,
      })
    } catch (error: any) {
      logger.error('❌ Get banks error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to get banks',
        error: error.message,
      })
    }
  }

  // Get withdrawal by reference
  static async getWithdrawalByReference(req: Request, res: Response) {
    try {
      const { reference } = req.params

      if (!reference) {
        return res.status(400).json({
          success: false,
          message: 'Withdrawal reference is required',
        })
      }

      logger.info('🔍 Getting withdrawal by reference:', reference)
      const withdrawal = await WithdrawalService.getWithdrawalByReference(
        reference,
      )

      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          message: 'Withdrawal not found',
        })
      }

      res.status(200).json({
        success: true,
        message: 'Withdrawal retrieved successfully',
        data: withdrawal,
      })
    } catch (error: any) {
      logger.error('❌ Get withdrawal by reference error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to get withdrawal',
        error: error.message,
      })
    }
  }
}
