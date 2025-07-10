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
  .then(() => {
    logger.info('✅ Connected to MongoDB successfully')
    logger.info(`📊 Database: ${mongoose.connection.db.databaseName}`)
  })
  .catch((err) => {
    logger.error('❌ MongoDB connection error:', err)
    process.exit(1) // Exit if we can't connect to database
  })

// Add connection event listeners
mongoose.connection.on('error', (err) => {
  logger.error('❌ MongoDB connection error:', err)
})

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB disconnected')
})

mongoose.connection.on('reconnected', () => {
  logger.info('✅ MongoDB reconnected')
})

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded())

// Health check endpoint
app.get('/', (req, res) => {
  logger.info('✅ GET / - Root endpoint hit')
  res.json({
    message: 'Telegram Gaming Payment Server',
    status: 'running',
    timestamp: new Date().toISOString(),
  })
})

// Webhook callback endpoint
app.post('/callback', (req, res) => {
  logger.info('🔔 Webhook callback received on /callback')
  PaymentController.handlePaymentCallback(req, res)
})

// API Routes
app.use('/api/payments', paymentRoutes)
app.use('/api/withdrawals', withdrawalRoutes)
app.use('/api/balance', balanceRoutes)

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
