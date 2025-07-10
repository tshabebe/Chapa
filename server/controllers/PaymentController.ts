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
      } = req.body

      logger.info('📤 Initializing payment:', {
        amount,
        currency,
        email,
        tx_ref,
      })

      const paymentData = await PaymentService.initializePayment({
        amount,
        currency,
        phone_number,
        tx_ref,
        return_url,
        callback_url,
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
      logger.info(
        '🔔 Payment callback received:',
        req.body.event || 'unknown event',
      )

      // Verify webhook signature
      const webhookSecret = process.env.WEBHOOK_SECRET
      if (webhookSecret) {
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
      }

      const { tx_ref, status, currency, amount, event } = req.body

      // Verify transaction with payment provider
      const verificationResult = await PaymentService.verifyTransaction(tx_ref)
      logger.info('✅ Transaction verified:', { tx_ref, status, event })

      // Update balance on successful payment
      if (status === 'success' && event === 'charge.success') {
        await BalanceService.incrementBalance(
          'default-user',
          parseFloat(amount),
        )
        logger.info('💰 Balance incremented by:', { amount, currency })
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
