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

// Add request logging middleware
app.use((req, res, next) => {
  logger.info(
    `📥 ${req.method} ${req.originalUrl} - Content-Length: ${req.headers['content-length']}`,
  )
  next()
})

// Raw body parsing for webhook signature verification
app.use('/callback', express.raw({ type: 'application/json', limit: '10mb' }))
app.use(
  '/api/payments/callback',
  express.raw({ type: 'application/json', limit: '10mb' }),
)

// Configure body parsing with proper limits and error handling
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      logger.info(`📦 Request buffer length: ${buf.length}`)
      logger.info(`📦 Content-Length header: ${req.headers['content-length']}`)
    },
  }),
)

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  }),
)

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

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error('❌ Server error:', err)

    // Handle specific body parsing errors
    if (err.type === 'request.size.invalid') {
      logger.error('❌ Content length mismatch:', {
        expected: err.expected,
        received: err.received,
        url: req.originalUrl,
        method: req.method,
        headers: req.headers,
      })
      res.status(400).json({
        success: false,
        message: 'Invalid request size',
        error: 'Content length mismatch',
      })
      return
    }

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
  logger.error(`❌ 404 - Endpoint not found: ${req.method} ${req.originalUrl}`)
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'POST /callback',
      'POST /api/payments/initialize',
      'POST /api/payments/callback',
      'GET /api/payments/status/:tx_ref',
    ],
  })
})

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
