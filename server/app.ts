import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

// Import routes
import paymentRoutes from './routes/paymentRoutes.js'
import withdrawalRoutes from './routes/withdrawalRoutes.js'
import balanceRoutes from './routes/balanceRoutes.js'

// Import bot
import { setupTelegramBot } from './bot/telegramBot.js'
import { MaintenanceService } from './services/MaintenanceService.js'
import { logger } from './utils/logger.js'
import { PaymentController } from './controllers/PaymentController.js'

dotenv.config()

const MONGODB_URL = process.env.MONGODB_URL
const PORT = process.env.PORT || 5000

// Connect to MongoDB
mongoose
  .connect(MONGODB_URL || 'mongodb://localhost:27017/chapa-payments')
  .then(() => logger.info('✅ Connected to MongoDB'))
  .catch((err) => logger.error('❌ MongoDB connection error:', err))

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/', (req, res) => {
  logger.info('✅ GET / - Root endpoint hit')
  res.json({
    message: 'Chapa Payment Server with Telegram Bot',
    status: 'running',
    timestamp: new Date().toISOString(),
  })
})
app.post('/callback', (res, req) => {
  console.log(req, res)
  console.log(res.headers)
  console.log(req.header)
})

// API Routes
app.use('/api/payments', paymentRoutes)
app.use('/api/withdrawals', withdrawalRoutes)
app.use('/api/balance', balanceRoutes)

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error('❌ Server error:', err)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'Something went wrong',
    })
  },
)

// // 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Endpoint not found',
//     path: req.originalUrl,
//   })
// })

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Express server running on port ${PORT}`)
  logger.info(`🌐 Webhook URL: ${process.env.CALLBACK_URL}`)
})

// Start the Telegram bot
logger.info('🤖 Initializing Telegram bot...')
const bot = setupTelegramBot()

// Start maintenance service
logger.info('🔧 Starting maintenance service...')
MaintenanceService.startMaintenance()

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('🛑 Received SIGINT, shutting down gracefully...')

  try {
    // Stop maintenance service
    MaintenanceService.stopMaintenance()
    logger.info('🔧 Maintenance service stopped')

    // Stop bot
    if (bot) {
      await bot.stop()
      logger.info('🤖 Bot stopped')
    }

    logger.info('✅ Graceful shutdown completed')
    process.exit(0)
  } catch (error) {
    logger.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
})

process.on('SIGTERM', async () => {
  logger.info('🛑 Received SIGTERM, shutting down gracefully...')

  try {
    // Stop maintenance service
    MaintenanceService.stopMaintenance()
    logger.info('🔧 Maintenance service stopped')

    // Stop bot
    if (bot) {
      await bot.stop()
      logger.info('🤖 Bot stopped')
    }

    logger.info('✅ Graceful shutdown completed')
    process.exit(0)
  } catch (error) {
    logger.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error)
  process.exit(1)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`)
  process.exit(1)
})

logger.info('✅ Application started successfully')

export default app
