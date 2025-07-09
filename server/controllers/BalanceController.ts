import type { Request, Response } from 'express'
import { BalanceService } from '../services/BalanceService.js'

export class BalanceController {
  // Get balance
  static async getBalance(req: Request, res: Response) {
    try {
      const userId =
        (req.query.userId as string) || req.params.userId || 'default-user'
      console.log('💰 Fetching balance for:', userId)

      const balance = await BalanceService.getBalance(userId)

      res.status(200).json({
        success: true,
        message: 'Balance retrieved successfully',
        data: balance,
      })
    } catch (error: any) {
      console.log('❌ Balance fetch error:', error.message)
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
      console.log('💰 Incrementing balance for:', userId, 'by:', amount)

      const balance = await BalanceService.incrementBalance(userId, amount)

      res.status(200).json({
        success: true,
        message: 'Balance incremented successfully',
        data: balance,
      })
    } catch (error: any) {
      console.log('❌ Balance increment error:', error.message)
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
      console.log('💰 Decrementing balance for:', userId, 'by:', amount)

      const balance = await BalanceService.decrementBalance(userId, amount)

      res.status(200).json({
        success: true,
        message: 'Balance decremented successfully',
        data: balance,
      })
    } catch (error: any) {
      console.log('❌ Balance decrement error:', error.message)
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
      console.log('💰 Checking balance for:', userId, 'amount:', amount)

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
      console.log('❌ Balance check error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to check balance',
        error: error.message,
      })
    }
  }
}
