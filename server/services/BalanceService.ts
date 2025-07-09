import Balance from '../models/Balance.js'

export class BalanceService {
  // Get balance for user
  static async getBalance(userId: string = 'default-user') {
    try {
      const balance = await Balance.getOrCreateBalance(userId)
      return balance
    } catch (error: any) {
      console.log('❌ Error getting balance:', error.message)
      throw new Error(`Failed to get balance: ${error.message}`)
    }
  }

  // Increment balance
  static async incrementBalance(
    userId: string = 'default-user',
    amount: number,
  ) {
    try {
      const balance = await Balance.getOrCreateBalance(userId)
      await balance.incrementBalance(amount)
      return balance
    } catch (error: any) {
      console.log('❌ Error incrementing balance:', error.message)
      throw new Error(`Failed to increment balance: ${error.message}`)
    }
  }

  // Decrement balance
  static async decrementBalance(
    userId: string = 'default-user',
    amount: number,
  ) {
    try {
      const balance = await Balance.getOrCreateBalance(userId)

      if (balance.balance < amount) {
        throw new Error('Insufficient balance')
      }

      balance.balance -= amount
      balance.lastUpdated = new Date()
      await balance.save()

      return balance
    } catch (error: any) {
      console.log('❌ Error decrementing balance:', error.message)
      throw new Error(`Failed to decrement balance: ${error.message}`)
    }
  }

  // Check if user has sufficient balance
  static async checkBalance(userId: string, amount: number): Promise<boolean> {
    try {
      const balance = await Balance.getOrCreateBalance(userId)
      return balance.balance >= amount
    } catch (error: any) {
      console.log('❌ Error checking balance:', error.message)
      return false
    }
  }

  // Get balance amount
  static async getBalanceAmount(
    userId: string = 'default-user',
  ): Promise<number> {
    try {
      const balance = await Balance.getOrCreateBalance(userId)
      return balance.balance
    } catch (error: any) {
      console.log('❌ Error getting balance amount:', error.message)
      return 0
    }
  }
}
