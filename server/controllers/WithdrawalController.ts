import type { Request, Response } from 'express'
import { WithdrawalService } from '../services/withdrawalService.js'
import { BalanceService } from '../services/BalanceService.js'
import { logger } from '../utils/logger.js'

export class WithdrawalController {
  // Get available banks
  static async getBanks(req: Request, res: Response) {
    try {
      logger.info('🏦 Fetching available banks')

      const banks = await WithdrawalService.getBanks()

      res.status(200).json({
        success: true,
        message: 'Banks retrieved successfully',
        data: banks,
      })
    } catch (error: any) {
      logger.error('❌ Banks fetch error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to fetch banks',
        error: error.message,
      })
    }
  }

  // Initiate withdrawal
  static async initiateWithdrawal(req: Request, res: Response) {
    try {
      const {
        amount,
        accountName,
        accountNumber,
        bankCode,
        bankName,
        userId = 'default-user',
      } = req.body

      logger.info('🏦 Initiating withdrawal:', {
        amount,
        accountName,
        bankName,
      })

      // Check if user has sufficient balance
      const hasSufficientBalance = await BalanceService.checkBalance(
        userId,
        amount,
      )
      if (!hasSufficientBalance) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance for withdrawal',
        })
      }

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
      logger.error('❌ Withdrawal error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Withdrawal failed',
        error: error.message,
      })
    }
  }

  // Verify withdrawal
  static async verifyWithdrawal(req: Request, res: Response) {
    try {
      const { reference } = req.params
      if (!reference) {
        return res.status(400).json({
          success: false,
          message: 'Reference parameter is required',
        })
      }
      logger.info('🔍 Verifying withdrawal:', { reference })

      const result = await WithdrawalService.verifyWithdrawal(reference)

      res.status(200).json({
        success: true,
        message: 'Withdrawal verification successful',
        data: result,
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
      const userId =
        (req.query.userId as string) || req.params.userId || 'default-user'
      logger.info('📋 Fetching withdrawal history for:', { userId })

      const withdrawals = await WithdrawalService.getWithdrawalHistory(userId)

      res.status(200).json({
        success: true,
        message: 'Withdrawal history retrieved successfully',
        data: withdrawals,
      })
    } catch (error: any) {
      logger.error('❌ Withdrawal history error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to fetch withdrawal history',
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
          message: 'Reference parameter is required',
        })
      }
      logger.info('🔍 Fetching withdrawal by reference:', { reference })

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
      logger.error('❌ Withdrawal fetch error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to fetch withdrawal',
        error: error.message,
      })
    }
  }
}
