import { SessionService } from './SessionService.js'
import { logger } from '../utils/logger.js'

export class MaintenanceService {
  private static maintenanceInterval: NodeJS.Timeout | null = null
  private static readonly CLEANUP_INTERVAL = 30 * 60 * 1000 // 30 minutes

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
        errors: 0,
      }

      // Cleanup expired sessions
      results.expiredSessionsCleaned =
        await SessionService.cleanupExpiredSessions()

      logger.info('🧹 Maintenance completed', results)
    } catch (error) {
      logger.error('Critical error during maintenance:', error)
    }
  }

  /**
   * Get maintenance status
   */
  static getStatus(): {
    isRunning: boolean
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
}
