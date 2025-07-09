import UserSession from '../models/UserSession.js'
import type { IUserSession } from '../models/UserSession.js'
import { logger } from '../utils/logger.js'

export class SessionService {
  /**
   * Get or create user session
   */
  static async getOrCreateSession(telegramId: number): Promise<IUserSession> {
    try {
      return await UserSession.getOrCreateSession(telegramId)
    } catch (error) {
      logger.error('Error getting/creating session:', error)
      throw new Error('Failed to manage user session')
    }
  }

  /**
   * Get user session
   */
  static async getSession(telegramId: number): Promise<IUserSession | null> {
    try {
      return await UserSession.findOne({ telegramId, isActive: true })
    } catch (error) {
      logger.error('Error getting session:', error)
      return null
    }
  }

  /**
   * Update user session state
   */
  static async updateSessionState(
    telegramId: number,
    state: string,
    data?: any,
  ): Promise<IUserSession> {
    try {
      const session = await this.getOrCreateSession(telegramId)
      return await session.updateState(state, data)
    } catch (error) {
      logger.error('Error updating session state:', error)
      throw new Error('Failed to update session state')
    }
  }

  /**
   * Clear user session
   */
  static async clearSession(telegramId: number): Promise<void> {
    try {
      const session = await UserSession.findOne({ telegramId })
      if (session) {
        await session.clearSession()
        logger.info(`Session cleared for user ${telegramId}`)
      }
    } catch (error) {
      logger.error('Error clearing session:', error)
    }
  }

  /**
   * Extend session timeout
   */
  static async extendSession(telegramId: number): Promise<void> {
    try {
      const session = await UserSession.findOne({ telegramId, isActive: true })
      if (session) {
        await session.extendSession()
      }
    } catch (error) {
      logger.error('Error extending session:', error)
    }
  }

  /**
   * Get session data
   */
  static async getSessionData(telegramId: number): Promise<any> {
    try {
      const session = await this.getSession(telegramId)
      if (!session) return null

      return {
        state: session.state,
        paymentData: session.paymentData,
        withdrawalData: session.withdrawalData,
        context: session.context,
        expiresAt: session.expiresAt,
      }
    } catch (error) {
      logger.error('Error getting session data:', error)
      return null
    }
  }

  /**
   * Update payment data in session
   */
  static async updatePaymentData(
    telegramId: number,
    paymentData: any,
  ): Promise<void> {
    try {
      const session = await this.getOrCreateSession(telegramId)
      session.paymentData = { ...session.paymentData, ...paymentData }
      await session.extendSession()
    } catch (error) {
      logger.error('Error updating payment data:', error)
      throw new Error('Failed to update payment data')
    }
  }

  /**
   * Update withdrawal data in session
   */
  static async updateWithdrawalData(
    telegramId: number,
    withdrawalData: any,
  ): Promise<void> {
    try {
      const session = await this.getOrCreateSession(telegramId)
      session.withdrawalData = { ...session.withdrawalData, ...withdrawalData }
      await session.extendSession()
    } catch (error) {
      logger.error('Error updating withdrawal data:', error)
      throw new Error('Failed to update withdrawal data')
    }
  }

  /**
   * Update context in session
   */
  static async updateContext(telegramId: number, context: any): Promise<void> {
    try {
      const session = await this.getOrCreateSession(telegramId)
      session.context = { ...session.context, ...context }
      await session.extendSession()
    } catch (error) {
      logger.error('Error updating context:', error)
      throw new Error('Failed to update context')
    }
  }

  /**
   * Check if session is valid
   */
  static async isSessionValid(telegramId: number): Promise<boolean> {
    try {
      const session = await UserSession.findOne({
        telegramId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      })
      return !!session
    } catch (error) {
      logger.error('Error checking session validity:', error)
      return false
    }
  }

  /**
   * Cleanup expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const cleanedCount = await UserSession.cleanupExpiredSessions()
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired sessions`)
      }
      return cleanedCount
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error)
      return 0
    }
  }

  /**
   * Get active sessions count
   */
  static async getActiveSessionsCount(): Promise<number> {
    try {
      return await UserSession.getActiveSessionsCount()
    } catch (error) {
      logger.error('Error getting active sessions count:', error)
      return 0
    }
  }

  /**
   * Get sessions by state
   */
  static async getSessionsByState(state: string): Promise<IUserSession[]> {
    try {
      return await UserSession.find({ state, isActive: true })
    } catch (error) {
      logger.error('Error getting sessions by state:', error)
      return []
    }
  }

  /**
   * Get stuck sessions (sessions in processing state for too long)
   */
  static async getStuckSessions(
    timeoutMinutes: number = 10,
  ): Promise<IUserSession[]> {
    try {
      const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000)
      return await UserSession.find({
        state: { $in: ['processing_payment', 'processing_withdrawal'] },
        isActive: true,
        updatedAt: { $lt: cutoffTime },
      })
    } catch (error) {
      logger.error('Error getting stuck sessions:', error)
      return []
    }
  }

  /**
   * Reset stuck sessions
   */
  static async resetStuckSessions(
    timeoutMinutes: number = 10,
  ): Promise<number> {
    try {
      const stuckSessions = await this.getStuckSessions(timeoutMinutes)
      let resetCount = 0

      for (const session of stuckSessions) {
        await session.clearSession()
        resetCount++
        logger.warn(`Reset stuck session for user ${session.telegramId}`)
      }

      return resetCount
    } catch (error) {
      logger.error('Error resetting stuck sessions:', error)
      return 0
    }
  }
}
