import UserSession from '../models/UserSession'
import type { IUserSession } from '../models/UserSession'
import { logger } from '../utils/logger'

export class SessionService {
  // Get or create user session
  static async getOrCreateSession(telegramId: number): Promise<IUserSession> {
    try {
      const session = await UserSession.getOrCreateSession(telegramId)
      logger.info(`📱 Session retrieved/created for user: ${telegramId}`)
      return session
    } catch (error) {
      logger.error('❌ Error getting/creating session:', error)
      throw new Error('Failed to get or create session')
    }
  }

  // Get user session
  static async getSession(telegramId: number): Promise<IUserSession | null> {
    try {
      const session = await UserSession.findOne({ telegramId })
      return session
    } catch (error) {
      logger.error('❌ Error getting session:', error)
      throw new Error('Failed to get session')
    }
  }

  // Update session state
  static async updateSessionState(
    telegramId: number,
    newState: string,
    data?: any,
  ): Promise<IUserSession> {
    try {
      const session = await UserSession.getOrCreateSession(telegramId)
      await session.updateState(newState, data)

      logger.info(
        `📱 Session state updated for user: ${telegramId}, state: ${newState}`,
      )
      return session
    } catch (error) {
      logger.error('❌ Error updating session state:', error)
      throw new Error('Failed to update session state')
    }
  }

  // Clear user session
  static async clearSession(telegramId: number): Promise<void> {
    try {
      const session = await UserSession.findOne({ telegramId })
      if (session) {
        await session.clearSession()
        logger.info(`📱 Session cleared for user: ${telegramId}`)
      }
    } catch (error) {
      logger.error('❌ Error clearing session:', error)
      throw new Error('Failed to clear session')
    }
  }

  // Extend session
  static async extendSession(telegramId: number): Promise<void> {
    try {
      const session = await UserSession.findOne({ telegramId })
      if (session) {
        await session.extendSession()
        logger.info(`📱 Session extended for user: ${telegramId}`)
      }
    } catch (error) {
      logger.error('❌ Error extending session:', error)
      throw new Error('Failed to extend session')
    }
  }

  // Get session data
  static async getSessionData(telegramId: number): Promise<{
    state: string
    paymentData?: any
    withdrawalData?: any
    isActive: boolean
    expiresAt: Date
  } | null> {
    try {
      const session = await UserSession.findOne({ telegramId })
      if (!session) {
        return null
      }

      return {
        state: session.state,
        paymentData: session.paymentData,
        withdrawalData: session.withdrawalData,
        isActive: session.isActive,
        expiresAt: session.expiresAt,
      }
    } catch (error) {
      logger.error('❌ Error getting session data:', error)
      throw new Error('Failed to get session data')
    }
  }

  // Cleanup expired sessions
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const cleanedCount = await UserSession.cleanupExpiredSessions()
      logger.info(`🧹 Cleaned up ${cleanedCount} expired sessions`)
      return cleanedCount
    } catch (error) {
      logger.error('❌ Error cleaning up expired sessions:', error)
      throw new Error('Failed to cleanup expired sessions')
    }
  }

  // Get active sessions count
  static async getActiveSessionsCount(): Promise<number> {
    try {
      const count = await UserSession.countDocuments({ isActive: true })
      return count
    } catch (error) {
      logger.error('❌ Error getting active sessions count:', error)
      throw new Error('Failed to get active sessions count')
    }
  }
}
