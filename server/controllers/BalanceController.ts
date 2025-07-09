import type { Request, Response } from 'express'
import { BalanceService } from '../services/BalanceService.js'
import { logger } from '../utils/logger.js'

export class BalanceController {
  // Get balance
  static async getBalance(req: Request, res: Response) {
    try {
      const userId =
        (req.query.userId as string) || req.params.userId || 'default-user'
      logger.info('💰 Fetching balance for:', { userId })

      const balance = await BalanceService.getBalance(userId)

      res.status(200).json({
        success: true,
        message: 'Balance retrieved successfully',
        data: balance,
      })
    } catch (error: any) {
      logger.error('❌ Balance fetch error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to fetch balance',
        error: error.message,
      })
    }
  }

  // Increment balance
  static async incrementBalance(req: Request, res: Response) {
    try {
      const { amount, userId = 'default-user' } = req.body
      logger.info('💰 Incrementing balance for:', { userId, amount })

      const balance = await BalanceService.incrementBalance(userId, amount)

      res.status(200).json({
        success: true,
        message: 'Balance incremented successfully',
        data: balance,
      })
    } catch (error: any) {
      logger.error('❌ Balance increment error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to increment balance',
        error: error.message,
      })
    }
  }

  // Decrement balance
  static async decrementBalance(req: Request, res: Response) {
    try {
      const { amount, userId = 'default-user' } = req.body
      logger.info('💰 Decrementing balance for:', { userId, amount })

      const balance = await BalanceService.decrementBalance(userId, amount)

      res.status(200).json({
        success: true,
        message: 'Balance decremented successfully',
        data: balance,
      })
    } catch (error: any) {
      logger.error('❌ Balance decrement error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to decrement balance',
        error: error.message,
      })
    }
  }

  // Check if user has sufficient balance
  static async checkBalance(req: Request, res: Response) {
    try {
      const { amount, userId = 'default-user' } = req.query
      logger.info('💰 Checking balance for:', { userId, amount })

      const hasSufficientBalance = await BalanceService.checkBalance(
        userId as string,
        parseFloat(amount as string),
      )

      res.status(200).json({
        success: true,
        message: 'Balance check completed',
        data: {
          hasSufficientBalance,
          userId,
          requiredAmount: amount,
        },
      })
    } catch (error: any) {
      logger.error('❌ Balance check error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to check balance',
        error: error.message,
      })
    }
  }
}
