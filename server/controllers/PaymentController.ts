import type { Request, Response } from 'express'
import crypto from 'crypto'
import axios from 'axios'
import { PaymentService } from '../services/PaymentService.js'
import { BalanceService } from '../services/BalanceService.js'
import { logger } from '../utils/logger.js'

export class PaymentController {
  // Initialize payment
  static async initializePayment(req: Request, res: Response) {
    try {
      const {
        amount,
        currency = 'ETB',
        email,
        phone_number,
        tx_ref,
        return_url,
        callback_url,
        userId, // Add userId to track who's making the payment
      } = req.body

      logger.info('📤 Initializing payment:', {
        amount,
        currency,
        email,
        tx_ref,
        userId,
      })

      const paymentData = await PaymentService.initializePayment({
        amount,
        currency,
        phone_number,
        tx_ref,
        return_url,
        callback_url,
        userId: userId ? parseInt(userId.toString()) : undefined,
      })

      res.status(200).json({
        success: true,
        message: 'Payment initialized successfully',
        data: paymentData,
      })
    } catch (error: any) {
      logger.error('❌ Payment initialization error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Payment initialization failed',
        error: error.message,
      })
    }
  }

  // Handle payment callback
  static async handlePaymentCallback(req: Request, res: Response) {
    try {
      logger.info('🔔 Payment callback received')
      logger.info('📋 Request method:', req.method)
      logger.info('📋 Request URL:', req.originalUrl)
      logger.info('📋 Request headers:', req.headers)

      // Handle raw body for webhook signature verification
      let body = req.body
      if (Buffer.isBuffer(req.body)) {
        // Convert raw buffer to string for logging
        const rawBody = req.body.toString('utf8')
        logger.info('📋 Raw request body:', rawBody)

        try {
          body = JSON.parse(rawBody)
        } catch (parseError) {
          logger.error('❌ Failed to parse JSON body:', parseError)
          return res.status(400).json({
            error: 'Invalid JSON body',
            message: 'Failed to parse request body',
          })
        }
      } else {
        logger.info('📋 Request body:', req.body)
      }

      logger.info('📋 Event type:', body.event || 'unknown event')

      // Verify webhook signature
      const webhookSecret = process.env.WEBHOOK_SECRET
      if (webhookSecret) {
        logger.info('🔍 Webhook secret found, verifying signature...')
        const isValid = PaymentService.verifyWebhookSignature(
          req,
          webhookSecret,
        )
        if (!isValid) {
          logger.error('❌ Invalid webhook signature')
          return res.status(401).json({
            error: 'Invalid webhook signature',
            message: 'Webhook verification failed',
          })
        }
        logger.info('✅ Webhook signature verified')
      } else {
        logger.warn(
          '⚠️ No WEBHOOK_SECRET found, skipping signature verification',
        )
      }

      const { tx_ref, status, currency, amount, event } = body

      // Find the payment record to get the actual user ID
      const payment = await PaymentService.findPaymentByTxRef(tx_ref)

      if (!payment) {
        logger.error('❌ Payment not found for tx_ref:', tx_ref)
        return res.status(404).json({
          error: 'Payment not found',
          message: 'No payment record found for this transaction',
        })
      }

      logger.info('✅ Found payment record for user:', payment.userId)

      // Verify transaction with payment provider
      const verificationResult = await PaymentService.verifyTransaction(tx_ref)
      logger.info('✅ Transaction verified:', { tx_ref, status, event })

      // Update balance on successful payment
      if (status === 'success' && event === 'charge.success') {
        // Use the actual user ID from the payment record
        await BalanceService.incrementBalance(
          payment.userId.toString(),
          parseFloat(amount),
        )
        logger.info(
          `💰 Balance incremented for user: ${payment.userId}, amount: ${amount}`,
        )

        // Mark payment as successful
        await payment.markSuccess()
      } else if (status === 'failed' || event === 'charge.failed') {
        // Mark payment as failed
        await payment.markFailed()
        logger.info('❌ Payment marked as failed for user:', payment.userId)
      }

      res.status(200).json({
        message: 'Callback processed successfully',
        tx_ref,
        status,
        event,
        userId: payment.userId,
        verified: true,
      })
    } catch (error: any) {
      logger.error('❌ Callback error:', error.message)
      res.status(400).json({
        message: 'Callback processing failed',
        error: error.message,
      })
    }
  }

  // Get payment status
  static async getPaymentStatus(req: Request, res: Response) {
    try {
      const { tx_ref } = req.params
      logger.info('🔍 Getting payment status for:', { tx_ref })

      if (!tx_ref) {
        return res.status(400).json({
          success: false,
          message: 'Transaction reference is required',
        })
      }
      const status = await PaymentService.getPaymentStatus(tx_ref)

      res.status(200).json({
        success: true,
        message: 'Payment status retrieved successfully',
        data: status,
      })
    } catch (error: any) {
      logger.error('❌ Payment status error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to get payment status',
        error: error.message,
      })
    }
  }
}
