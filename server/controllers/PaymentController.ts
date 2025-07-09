import type { Request, Response } from 'express'
import crypto from 'crypto'
import axios from 'axios'
import { PaymentService } from '../services/PaymentService.js'
import { BalanceService } from '../services/BalanceService.js'

export class PaymentController {
  // Initialize payment
  static async initializePayment(req: Request, res: Response) {
    try {
      const {
        amount,
        currency = 'ETB',
        email,
        first_name,
        last_name,
        phone_number,
        tx_ref,
        return_url,
        callback_url,
      } = req.body

      console.log('📤 Initializing payment:', {
        amount,
        currency,
        email,
        tx_ref,
      })

      const paymentData = await PaymentService.initializePayment({
        amount,
        currency,
        email,
        first_name,
        last_name,
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
      console.log('❌ Payment initialization error:', error.message)
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
      console.log(
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
          console.log('❌ Invalid webhook signature')
          return res.status(401).json({
            error: 'Invalid webhook signature',
            message: 'Webhook verification failed',
          })
        }
        console.log('✅ Webhook signature verified')
      }

      const { tx_ref, status, currency, amount, event } = req.body

      // Verify transaction with payment provider
      const verificationResult = await PaymentService.verifyTransaction(tx_ref)
      console.log('✅ Transaction verified:', tx_ref, status, event)

      // Update balance on successful payment
      if (status === 'success' && event === 'charge.success') {
        await BalanceService.incrementBalance(
          'default-user',
          parseFloat(amount),
        )
        console.log('💰 Balance incremented by:', amount, currency)
      }

      res.status(200).json({
        message: 'Callback processed successfully',
        tx_ref,
        status,
        event,
        verified: true,
      })
    } catch (error: any) {
      console.log('❌ Callback error:', error.message)
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
      console.log('🔍 Getting payment status for:', tx_ref)

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
      console.log('❌ Payment status error:', error.message)
      res.status(400).json({
        success: false,
        message: 'Failed to get payment status',
        error: error.message,
      })
    }
  }
}
