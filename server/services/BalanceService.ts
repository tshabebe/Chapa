import Balance from '../models/Balance.js'
import { logger } from '../utils/logger.js'

export class BalanceService {
  // Get user balance
  static async getBalance(userId: string): Promise<number> {
    try {
      const balance = await Balance.getOrCreateBalance(userId)
      return balance.balance
    } catch (error) {
      logger.error('❌ Get balance error:', error)
      throw new Error('Failed to get balance')
    }
  }

  // Increment user balance
  static async incrementBalance(
    userId: string,
    amount: number,
  ): Promise<number> {
    try {
      const balance = await Balance.getOrCreateBalance(userId)

      // Increment the balance
      balance.balance += amount
      await balance.save()

      logger.info(
        `💰 Balance incremented for user: ${userId}, amount: ${amount}, newBalance: ${balance.balance}`,
      )

      return balance.balance
    } catch (error) {
      logger.error('❌ Increment balance error:', error)
      throw new Error('Failed to increment balance')
    }
  }

  // Decrement user balance
  static async decrementBalance(
    userId: string,
    amount: number,
  ): Promise<number> {
    try {
      const balance = await Balance.getOrCreateBalance(userId)

      // Check if user has sufficient balance
      if (balance.balance < amount) {
        throw new Error('Insufficient balance')
      }

      // Decrement the balance
      balance.balance -= amount
      await balance.save()

      logger.info(
        `💰 Balance decremented for user: ${userId}, amount: ${amount}, newBalance: ${balance.balance}`,
      )

      return balance.balance
    } catch (error) {
      logger.error('❌ Decrement balance error:', error)
      throw new Error('Failed to decrement balance')
    }
  }

  // Check if user has sufficient balance
  static async checkBalance(userId: string, amount: number): Promise<boolean> {
    try {
      const balance = await Balance.getOrCreateBalance(userId)
      return balance.balance >= amount
    } catch (error) {
      logger.error('❌ Check balance error:', error)
      throw new Error('Failed to check balance')
    }
  }

  // Set user balance to a specific amount
  static async setBalance(userId: string, amount: number): Promise<number> {
    try {
      const balance = await Balance.getOrCreateBalance(userId)

      // Set the balance
      balance.balance = amount
      await balance.save()

      logger.info(
        `💰 Balance set for user: ${userId}, newBalance: ${balance.balance}`,
      )

      return balance.balance
    } catch (error) {
      logger.error('❌ Set balance error:', error)
      throw new Error('Failed to set balance')
    }
  }
}
