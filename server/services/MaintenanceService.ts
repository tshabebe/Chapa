import { SessionService } from './SessionService.js'
import { UserService } from './UserService.js'
import { logger } from '../utils/logger.js'

export class MaintenanceService {
  private static maintenanceInterval: NodeJS.Timeout | null = null
  private static readonly CLEANUP_INTERVAL = 30 * 60 * 1000 // 30 minutes
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  private static readonly USER_INACTIVITY_DAYS = 30 // 30 days

  /**
   * Start maintenance service
   */
  static startMaintenance(): void {
    if (this.maintenanceInterval) {
      logger.warn('Maintenance service already running')
      return
    }

    logger.info('Starting maintenance service')

    this.maintenanceInterval = setInterval(async () => {
      try {
        await this.performMaintenance()
      } catch (error) {
        logger.error('Error during maintenance:', error)
      }
    }, this.CLEANUP_INTERVAL)

    // Perform initial maintenance
    this.performMaintenance()
  }

  /**
   * Stop maintenance service
   */
  static stopMaintenance(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval)
      this.maintenanceInterval = null
      logger.info('Maintenance service stopped')
    }
  }

  /**
   * Perform maintenance tasks
   */
  static async performMaintenance(): Promise<void> {
    try {
      logger.info('Starting maintenance tasks...')

      const startTime = Date.now()
      const results = {
        expiredSessionsCleaned: 0,
        stuckSessionsReset: 0,
        inactiveUsersFound: 0,
        errors: 0,
      }

      // Cleanup expired sessions
      try {
        results.expiredSessionsCleaned =
          await SessionService.cleanupExpiredSessions()
      } catch (error) {
        logger.error('Error cleaning expired sessions:', error)
        results.errors++
      }

      // Reset stuck sessions
      try {
        results.stuckSessionsReset = await SessionService.resetStuckSessions()
      } catch (error) {
        logger.error('Error resetting stuck sessions:', error)
        results.errors++
      }

      // Check for inactive users
      try {
        const inactiveUsers = await UserService.getInactiveUsers(
          this.USER_INACTIVITY_DAYS,
        )
        results.inactiveUsersFound = inactiveUsers.length

        if (inactiveUsers.length > 0) {
          logger.info(
            `Found ${inactiveUsers.length} inactive users (${this.USER_INACTIVITY_DAYS}+ days)`,
          )
        }
      } catch (error) {
        logger.error('Error checking inactive users:', error)
        results.errors++
      }

      const duration = Date.now() - startTime

      logger.info('Maintenance completed', {
        duration: `${duration}ms`,
        ...results,
      })

      // Log warning if there were errors
      if (results.errors > 0) {
        logger.warn(`Maintenance completed with ${results.errors} errors`)
      }
    } catch (error) {
      logger.error('Critical error during maintenance:', error)
    }
  }

  /**
   * Get maintenance status
   */
  static getStatus(): {
    isRunning: boolean
    lastRun?: Date
    nextRun?: Date
  } {
    return {
      isRunning: !!this.maintenanceInterval,
      nextRun: this.maintenanceInterval
        ? new Date(Date.now() + this.CLEANUP_INTERVAL)
        : undefined,
    }
  }

  /**
   * Force maintenance run
   */
  static async forceMaintenance(): Promise<void> {
    logger.info('Forcing maintenance run...')
    await this.performMaintenance()
  }

  /**
   * Get system health metrics
   */
  static async getHealthMetrics(): Promise<any> {
    try {
      const [activeSessions, systemStats, stuckSessions, inactiveUsers] =
        await Promise.all([
          SessionService.getActiveSessionsCount(),
          UserService.getSystemStats(),
          SessionService.getStuckSessions(),
          UserService.getInactiveUsers(7), // Last 7 days
        ])

      return {
        activeSessions,
        systemStats,
        stuckSessions: stuckSessions.length,
        inactiveUsers: inactiveUsers.length,
        maintenanceStatus: this.getStatus(),
        timestamp: new Date(),
      }
    } catch (error) {
      logger.error('Error getting health metrics:', error)
      throw new Error('Failed to get health metrics')
    }
  }
}
