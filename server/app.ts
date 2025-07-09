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

dotenv.config()

const MONGODB_URL = process.env.MONGODB_URL
const PORT = process.env.PORT || 5000

// Connect to MongoDB
mongoose
  .connect(MONGODB_URL || 'mongodb://localhost:27017/chapa-payments')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.log('❌ MongoDB connection error:', err))

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/', (req, res) => {
  console.log('✅ GET / - Root endpoint hit')
  res.json({
    message: 'Chapa Payment Server with Telegram Bot',
    status: 'running',
    timestamp: new Date().toISOString(),
  })
})

// API Routes
app.use('/api/payments', paymentRoutes)
app.use('/api/withdrawals', withdrawalRoutes)
app.use('/api/balance', balanceRoutes)

// Legacy endpoints for backward compatibility
app.post('/payment-callback', (req, res) => {
  // Redirect to new endpoint
  req.url = '/api/payments/callback'
  app._router.handle(req, res)
})

app.get('/withdrawal/verify/:reference', (req, res) => {
  // Redirect to new endpoint
  req.url = `/api/withdrawals/verify/${req.params.reference}`
  app._router.handle(req, res)
})

app.get('/withdrawal/history', (req, res) => {
  // Redirect to new endpoint
  req.url = '/api/withdrawals/history'
  app._router.handle(req, res)
})

app.get('/withdrawal/history/:userId', (req, res) => {
  // Redirect to new endpoint
  req.url = `/api/withdrawals/history/${req.params.userId}`
  app._router.handle(req, res)
})

app.get('/banks', (req, res) => {
  // Redirect to new endpoint
  req.url = '/api/withdrawals/banks'
  app._router.handle(req, res)
})

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error('❌ Server error:', err)
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Express server running on port ${PORT}`)
  console.log(`🌐 Webhook URL: ${process.env.CALLBACK_URL}`)
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
