import User from '../models/User.js'
import type { IUser } from '../models/User.js'
import UserSession from '../models/UserSession.js'
import type { IUserSession } from '../models/UserSession.js'
import { logger } from '../utils/logger.js'

export class UserService {
  /**
   * Get or create user from Telegram data
   */
  static async getOrCreateUser(telegramUser: {
    id: number
    username?: string
    first_name: string
    last_name?: string
  }): Promise<IUser> {
    try {
      const user = await User.getOrCreateUser({
        telegramId: telegramUser.id,
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      })

      logger.info(`User ${telegramUser.id} accessed bot`, {
        userId: user._id,
        telegramId: telegramUser.id,
        username: telegramUser.username,
      })

      return user
    } catch (error) {
      logger.error('Error getting/creating user:', error)
      throw new Error('Failed to process user data')
    }
  }

  /**
   * Get user by Telegram ID
   */
  static async getUserByTelegramId(telegramId: number): Promise<IUser | null> {
    try {
      return await User.findOne({ telegramId })
    } catch (error) {
      logger.error('Error getting user by Telegram ID:', error)
      throw new Error('Failed to get user')
    }
  }

  /**
   * Update user activity
   */
  static async updateUserActivity(telegramId: number): Promise<void> {
    try {
      const user = await User.findOne({ telegramId })
      if (user) {
        await user.updateActivity()
      }
    } catch (error) {
      logger.error('Error updating user activity:', error)
    }
  }

  /**
   * Check if user is blocked
   */
  static async isUserBlocked(telegramId: number): Promise<boolean> {
    try {
      const user = await User.findOne({ telegramId })
      return user?.isBlocked || false
    } catch (error) {
      logger.error('Error checking user block status:', error)
      return false
    }
  }

  /**
   * Block or unblock user
   */
  static async toggleUserBlock(telegramId: number): Promise<boolean> {
    try {
      const user = await User.findOne({ telegramId })
      if (!user) {
        throw new Error('User not found')
      }

      await user.toggleBlock()
      logger.info(
        `User ${telegramId} ${user.isBlocked ? 'blocked' : 'unblocked'}`,
      )

      return user.isBlocked
    } catch (error) {
      logger.error('Error toggling user block:', error)
      throw new Error('Failed to update user status')
    }
  }

  /**
   * Update user payment statistics
   */
  static async updatePaymentStats(
    telegramId: number,
    amount: number,
  ): Promise<void> {
    try {
      const user = await User.findOne({ telegramId })
      if (user) {
        await user.updatePaymentStats(amount)
        logger.info(`Updated payment stats for user ${telegramId}: +${amount}`)
      }
    } catch (error) {
      logger.error('Error updating payment stats:', error)
    }
  }

  /**
   * Update user withdrawal statistics
   */
  static async updateWithdrawalStats(
    telegramId: number,
    amount: number,
  ): Promise<void> {
    try {
      const user = await User.findOne({ telegramId })
      if (user) {
        await user.updateWithdrawalStats(amount)
        logger.info(
          `Updated withdrawal stats for user ${telegramId}: +${amount}`,
        )
      }
    } catch (error) {
      logger.error('Error updating withdrawal stats:', error)
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(telegramId: number): Promise<any> {
    try {
      const user = await User.findOne({ telegramId })
      if (!user) {
        throw new Error('User not found')
      }

      return {
        totalPayments: user.statistics.totalPayments,
        totalWithdrawals: user.statistics.totalWithdrawals,
        totalAmountPaid: user.statistics.totalAmountPaid,
        totalAmountWithdrawn: user.statistics.totalAmountWithdrawn,
        lastPaymentDate: user.statistics.lastPaymentDate,
        lastWithdrawalDate: user.statistics.lastWithdrawalDate,
        registrationDate: user.registrationDate,
        lastActivity: user.lastActivity,
      }
    } catch (error) {
      logger.error('Error getting user stats:', error)
      throw new Error('Failed to get user statistics')
    }
  }

  /**
   * Get all active users
   */
  static async getActiveUsers(): Promise<IUser[]> {
    try {
      return await User.getActiveUsers()
    } catch (error) {
      logger.error('Error getting active users:', error)
      throw new Error('Failed to get active users')
    }
  }

  /**
   * Get inactive users for cleanup
   */
  static async getInactiveUsers(daysInactive: number = 30): Promise<IUser[]> {
    try {
      return await User.getInactiveUsers(daysInactive)
    } catch (error) {
      logger.error('Error getting inactive users:', error)
      throw new Error('Failed to get inactive users')
    }
  }

  /**
   * Get system statistics
   */
  static async getSystemStats(): Promise<any> {
    try {
      const totalUsers = await User.countDocuments()
      const activeUsers = await User.countDocuments({
        isActive: true,
        isBlocked: false,
      })
      const blockedUsers = await User.countDocuments({ isBlocked: true })
      const activeSessions = await UserSession.getActiveSessionsCount()

      const totalPayments = await User.aggregate([
        { $group: { _id: null, total: { $sum: '$statistics.totalPayments' } } },
      ])

      const totalWithdrawals = await User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$statistics.totalWithdrawals' },
          },
        },
      ])

      const totalAmountPaid = await User.aggregate([
        {
          $group: { _id: null, total: { $sum: '$statistics.totalAmountPaid' } },
        },
      ])

      const totalAmountWithdrawn = await User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$statistics.totalAmountWithdrawn' },
          },
        },
      ])

      return {
        totalUsers,
        activeUsers,
        blockedUsers,
        activeSessions,
        totalPayments: totalPayments[0]?.total || 0,
        totalWithdrawals: totalWithdrawals[0]?.total || 0,
        totalAmountPaid: totalAmountPaid[0]?.total || 0,
        totalAmountWithdrawn: totalAmountWithdrawn[0]?.total || 0,
      }
    } catch (error) {
      logger.error('Error getting system stats:', error)
      throw new Error('Failed to get system statistics')
    }
  }
}
