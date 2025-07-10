import type { Request, Response } from 'express'
import { BalanceService } from '../services/BalanceService.js'
import { logger } from '../utils/logger.js'

export class BalanceController {
  // Get user balance
  static async getBalance(req: Request, res: Response) {
    try {
      const userId = req.params.userId || (req.query.userId as string)

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        })
      }

      logger.info('💰 Getting balance for user:', userId)
      const balance = await BalanceService.getBalance(userId)

      res.status(200).json({
        success: true,
        message: 'Balance retrieved successfully',
        data: {
          userId,
          balance,
        },
      })
    } catch (error: any) {
      logger.error('❌ Get balance error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to get balance',
        error: error.message,
      })
    }
  }

  // Increment user balance
  static async incrementBalance(req: Request, res: Response) {
    try {
      const { amount, userId } = req.body

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

      logger.info(
        `💰 Incrementing balance for user: ${userId}, amount: ${amount}`,
      )
      const newBalance = await BalanceService.incrementBalance(userId, amount)

      res.status(200).json({
        success: true,
        message: 'Balance incremented successfully',
        data: {
          userId,
          amount,
          newBalance,
        },
      })
    } catch (error: any) {
      logger.error('❌ Increment balance error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to increment balance',
        error: error.message,
      })
    }
  }

  // Decrement user balance
  static async decrementBalance(req: Request, res: Response) {
    try {
      const { amount, userId } = req.body

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

      logger.info(
        `💰 Decrementing balance for user: ${userId}, amount: ${amount}`,
      )
      const newBalance = await BalanceService.decrementBalance(userId, amount)

      res.status(200).json({
        success: true,
        message: 'Balance decremented successfully',
        data: {
          userId,
          amount,
          newBalance,
        },
      })
    } catch (error: any) {
      logger.error('❌ Decrement balance error:', error.message)
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
      const { amount, userId } = req.query

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        })
      }

      if (!amount || parseFloat(amount as string) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required',
        })
      }

      logger.info(`💰 Checking balance for user: ${userId}, amount: ${amount}`)
      const hasSufficientBalance = await BalanceService.checkBalance(
        userId as string,
        parseFloat(amount as string),
      )

      res.status(200).json({
        success: true,
        message: 'Balance check completed',
        data: {
          userId,
          amount: parseFloat(amount as string),
          hasSufficientBalance,
        },
      })
    } catch (error: any) {
      logger.error('❌ Check balance error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to check balance',
        error: error.message,
      })
    }
  }
}
