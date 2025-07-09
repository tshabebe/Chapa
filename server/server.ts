import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'
import crypto from 'crypto'
import mongoose from 'mongoose'
import Balance from './models/Balance.js'

import { WithdrawalService } from './services/withdrawalService.js'
import { MaintenanceService } from './services/MaintenanceService.js'
import { logger } from './utils/logger.js'
import type { BankInfo } from './services/withdrawalService.js'

dotenv.config()

const CHAPA_AUTH_KEY = process.env.CHAPA_AUTH_KEY
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
const CALLBACK_URL = process.env.CALLBACK_URL
const MONGODB_URL = process.env.MONGODB_URL
const BOT_RETURN_URL = process.env.BOT_RETURN_URL
const PORT = process.env.PORT || 5000

mongoose
  .connect(MONGODB_URL || 'mongodb://localhost:27017/chapa-payments')
  .then(() => logger.info('✅ Connected to MongoDB'))
  .catch((err) => logger.error('❌ MongoDB connection error:', err))

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (_req, res) => {
  logger.info('✅ GET / - Root endpoint hit')
  res.json({ message: 'Chapa Payment Server with Telegram Bot' })
})

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthMetrics = await MaintenanceService.getHealthMetrics()
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date(),
      metrics: healthMetrics,
    })
  } catch (error) {
    logger.error('Health check failed:', error)
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date(),
      error: 'Health check failed',
    })
  }
})

// Force maintenance endpoint (admin only)
app.post('/admin/maintenance', async (req: any, res: any) => {
  try {
    const adminKey = req.headers['x-admin-key']
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    await MaintenanceService.forceMaintenance()
    res.status(200).json({ message: 'Maintenance completed successfully' })
  } catch (error) {
    logger.error('Forced maintenance failed:', error)
    res.status(500).json({ error: 'Maintenance failed' })
  }
})

app.post('/payment-callback', async (req, res) => {
  logger.info(
    '🔔 Payment callback received:',
    req.body.event || 'unknown event',
  )

  // Verify webhook signature
  const chapaSignature = req.headers['chapa-signature'] as string
  const xChapaSignature = req.headers['x-chapa-signature'] as string

  if (WEBHOOK_SECRET) {
    const payload = JSON.stringify(req.body)
    const expectedHash = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex')

    const isChapaSignatureValid = chapaSignature === expectedHash
    const isXChapaSignatureValid = xChapaSignature === expectedHash

    if (!isChapaSignatureValid && !isXChapaSignatureValid) {
      logger.error('❌ Invalid webhook signature')
      res.status(401).json({
        error: 'Invalid webhook signature',
        message: 'Webhook verification failed',
      })
      return
    }
    logger.info('✅ Webhook signature verified')
  }

  try {
    const { tx_ref, status, currency, amount, event } = req.body

    // Verify the transaction with Chapa
    const verificationResponse = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer ${CHAPA_AUTH_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    )

    logger.info('✅ Verification response:', verificationResponse.data)
    logger.info(
      `✅ Transaction verified: ${tx_ref}, status: ${status}, event: ${event}`,
    )

    // Increment balance on successful payment
    if (status === 'success' && event === 'charge.success') {
      try {
        const balance = (await Balance.findOne()) || new Balance()
        balance.balance += parseFloat(amount)
        balance.lastUpdated = new Date()
        await balance.save()
        logger.info(`💰 Balance incremented by: ${amount} ${currency}`)
      } catch (error: any) {
        logger.error('❌ Balance increment error:', error.message)
      }
    }

    res.status(200).json({
      message: 'Callback processed successfully',
      tx_ref,
      status,
      event,
      verified: true,
    })
  } catch (error: any) {
    logger.error('❌ Callback error:', error.message)
    res.status(400).json({
      message: 'Callback processing failed',
      error: error.message,
    })
  }
})

// Verify withdrawal endpoint
app.get('/withdrawal/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params
    logger.info('🔍 Verifying withdrawal:', reference)

    const result = await WithdrawalService.verifyWithdrawal(reference)

    res.status(200).json({
      message: 'Withdrawal verification successful',
      data: result,
    })
  } catch (error: any) {
    logger.error('❌ Withdrawal verification error:', error.message)
    res.status(400).json({
      message: 'Withdrawal verification failed',
      error: error.message,
    })
  }
})

// Get withdrawal history endpoint
app.get('/withdrawal/history', async (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'default-user'
    logger.info('📋 Fetching withdrawal history for:', userId)

    const withdrawals = await WithdrawalService.getWithdrawalHistory(userId)

    res.status(200).json({
      message: 'Withdrawal history retrieved successfully',
      data: withdrawals,
    })
  } catch (error: any) {
    logger.error('❌ Withdrawal history error:', error.message)
    res.status(400).json({
      message: 'Failed to fetch withdrawal history',
      error: error.message,
    })
  }
})

// Get withdrawal history for specific user endpoint
app.get('/withdrawal/history/:userId', async (req, res) => {
  try {
    const userId = req.params.userId
    logger.info('📋 Fetching withdrawal history for:', userId)

    const withdrawals = await WithdrawalService.getWithdrawalHistory(userId)

    res.status(200).json({
      message: 'Withdrawal history retrieved successfully',
      data: withdrawals,
    })
  } catch (error: any) {
    logger.error('❌ Withdrawal history error:', error.message)
    res.status(400).json({
      message: 'Failed to fetch withdrawal history',
      error: error.message,
    })
  }
})

// Get available banks endpoint
app.get('/banks', async (req, res) => {
  try {
    logger.info('🏦 Fetching available banks')

    const banks = await WithdrawalService.getBanks()

    res.status(200).json({
      message: 'Banks retrieved successfully',
      data: banks,
    })
  } catch (error: any) {
    logger.error('❌ Banks fetch error:', error.message)
    res.status(400).json({
      message: 'Failed to fetch banks',
      error: error.message,
    })
  }
})

// Start the server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`)

  // Start maintenance service
  MaintenanceService.startMaintenance()
  logger.info('🔧 Maintenance service started')
})

export default app
