import User from '../models/User'
import type { IUser } from '../models/User'
import UserSession from '../models/UserSession'
import { logger } from '../utils/logger'

export class UserService {
  // Get or create user
  static async getOrCreateUser(userData: {
    telegramId: number
    username?: string
    firstName: string
    lastName?: string
  }): Promise<IUser> {
    try {
      const user = await User.getOrCreateUser(userData)
      logger.info(`👤 User retrieved/created: ${user.telegramId}`)
      return user
    } catch (error) {
      logger.error('❌ Error getting/creating user:', error)
      throw new Error('Failed to get or create user')
    }
  }

  // Get user by Telegram ID
  static async getUserByTelegramId(telegramId: number): Promise<IUser | null> {
    try {
      const user = await User.findOne({ telegramId })
      return user
    } catch (error) {
      logger.error('❌ Error getting user by Telegram ID:', error)
      throw new Error('Failed to get user')
    }
  }

  // Update user activity
  static async updateUserActivity(telegramId: number): Promise<void> {
    try {
      const user = await User.findOne({ telegramId })
      if (user) {
        await user.updateActivity()
        logger.info(`👤 Updated activity for user: ${telegramId}`)
      }
    } catch (error) {
      logger.error('❌ Error updating user activity:', error)
    }
  }

  // Get user statistics (simplified - no statistics tracking)
  static async getUserStats(telegramId: number): Promise<{
    telegramId: number
    username?: string
    firstName: string
    lastName?: string
    isActive: boolean
    lastActivity: Date
    registrationDate: Date
  } | null> {
    try {
      const user = await User.findOne({ telegramId })
      if (!user) {
        return null
      }

      return {
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        lastActivity: user.lastActivity,
        registrationDate: user.registrationDate,
      }
    } catch (error) {
      logger.error('❌ Error getting user stats:', error)
      throw new Error('Failed to get user statistics')
    }
  }

  // Get all users (for admin purposes)
  static async getAllUsers(): Promise<IUser[]> {
    try {
      const users = await User.find({}).sort({ lastActivity: -1 })
      return users
    } catch (error) {
      logger.error('❌ Error getting all users:', error)
      throw new Error('Failed to get users')
    }
  }

  // Get active users count
  static async getActiveUsersCount(): Promise<number> {
    try {
      const count = await User.countDocuments({ isActive: true })
      return count
    } catch (error) {
      logger.error('❌ Error getting active users count:', error)
      throw new Error('Failed to get active users count')
    }
  }

  // Get system statistics
  static async getSystemStats(): Promise<{
    totalUsers: number
    activeUsers: number
    activeSessions: number
  }> {
    try {
      const totalUsers = await User.countDocuments()
      const activeUsers = await User.countDocuments({ isActive: true })
      const activeSessions = await UserSession.countDocuments({
        isActive: true,
      })

      return {
        totalUsers,
        activeUsers,
        activeSessions,
      }
    } catch (error) {
      logger.error('❌ Error getting system stats:', error)
      throw new Error('Failed to get system statistics')
    }
  }
}
