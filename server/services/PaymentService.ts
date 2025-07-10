import type { Request } from 'express'
import axios from 'axios'
import crypto from 'crypto'
import { logger } from '../utils/logger.js'
import Payment from '../models/Payment.js'

const CHAPA_AUTH_KEY = process.env.CHAPA_AUTH_KEY
const CALLBACK_URL = process.env.CALLBACK_URL
const BOT_RETURN_URL = process.env.BOT_RETURN_URL

export interface PaymentRequest {
  amount: string
  currency: string
  phone_number: string
  tx_ref: string
  return_url?: string
  callback_url?: string
  userId?: number // Add user ID to track who made the payment
}

export class PaymentService {
  // Initialize payment with Chapa
  static async initializePayment(request: PaymentRequest) {
    try {
      const requestPayload = {
        amount: request.amount,
        currency: request.currency,
        phone_number: request.phone_number,
        tx_ref: request.tx_ref,
        return_url: request.return_url,
        callback_url: request.callback_url,
        'customization[title]': 'Payment for My App',
        'customization[description]': 'Thank you for your payment',
        'meta[hide_receipt]': 'false',
      }

      logger.info('📤 Sending request to Chapa:', requestPayload)

      const response = await axios.post(
        'https://api.chapa.co/v1/transaction/initialize',
        requestPayload,
        {
          headers: {
            Authorization: `Bearer ${CHAPA_AUTH_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      )

      logger.info('✅ Chapa API response:', response.data)

      if (!response.data.data?.checkout_url) {
        throw new Error('No payment URL received from Chapa API')
      }

      // Track the payment in our database
      if (request.userId) {
        await Payment.createPayment({
          userId: request.userId,
          tx_ref: request.tx_ref,
          amount: parseFloat(request.amount),
          currency: request.currency,
          metadata: {
            phoneNumber: request.phone_number,
          },
        })
        logger.info('💾 Payment tracked in database for user:', request.userId)
      }

      return response.data
    } catch (error: any) {
      logger.error('❌ Payment initialization error:', error.message)
      throw new Error(`Payment initialization failed: ${error.message}`)
    }
  }

  // Verify webhook signature
  static verifyWebhookSignature(req: Request, webhookSecret: string): boolean {
    try {
      // Debug: Log all headers to see what's actually being received
      logger.info('🔍 All headers received:', req.headers)

      // Check for both possible header names (case-sensitive)
      const chapaSignature = req.headers['Chapa-Signature'] as string // Capital C and S
      const xChapaSignature = req.headers['x-chapa-signature'] as string

      logger.info('🔍 Chapa-Signature header:', chapaSignature)
      logger.info('🔍 x-chapa-signature header:', xChapaSignature)

      // Get the raw payload for signature verification
      let payload: string
      if (Buffer.isBuffer(req.body)) {
        // Use raw buffer for signature verification
        payload = req.body.toString('utf8')
        logger.info('🔍 Using raw buffer payload for signature verification')
      } else {
        // Use JSON stringified body
        payload = JSON.stringify(req.body)
        logger.info(
          '🔍 Using JSON stringified payload for signature verification',
        )
      }

      const expectedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex')

      logger.info('🔍 Expected hash:', expectedHash)
      logger.info('🔍 Request payload:', payload)

      const isChapaSignatureValid = chapaSignature === expectedHash
      const isXChapaSignatureValid = xChapaSignature === expectedHash

      logger.info('🔍 Chapa-Signature valid:', isChapaSignatureValid)
      logger.info('🔍 x-chapa-signature valid:', isXChapaSignatureValid)

      return isChapaSignatureValid || isXChapaSignatureValid
    } catch (error: any) {
      logger.error('❌ Webhook signature verification error:', error.message)
      return false
    }
  }

  // Verify transaction with Chapa
  static async verifyTransaction(tx_ref: string) {
    try {
      const response = await axios.get(
        `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
        {
          headers: {
            Authorization: `Bearer ${CHAPA_AUTH_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      )

      logger.info('✅ Verification response:', response.data)
      return response.data
    } catch (error: any) {
      logger.error('❌ Transaction verification error:', error.message)
      throw new Error(`Transaction verification failed: ${error.message}`)
    }
  }

  // Get payment status
  static async getPaymentStatus(tx_ref: string) {
    try {
      const response = await axios.get(
        `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
        {
          headers: {
            Authorization: `Bearer ${CHAPA_AUTH_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      )

      return response.data
    } catch (error: any) {
      logger.error('❌ Payment status error:', error.message)
      throw new Error(`Failed to get payment status: ${error.message}`)
    }
  }

  // Find payment by transaction reference
  static async findPaymentByTxRef(tx_ref: string) {
    try {
      const payment = await Payment.findByTxRef(tx_ref)
      return payment
    } catch (error: any) {
      logger.error('❌ Error finding payment by tx_ref:', error.message)
      return null
    }
  }

  // Create payment (alias for initializePayment for backward compatibility)
  static async createPayment(userId: string, amount: number, mobile: string) {
    const tx_ref = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const request: PaymentRequest = {
      amount: amount.toString(),
      currency: 'ETB',
      phone_number: mobile,
      tx_ref,
      callback_url: CALLBACK_URL, // Add the callback URL from environment
      return_url: BOT_RETURN_URL,
      userId: parseInt(userId), // Convert string userId to number
    }
    return this.initializePayment(request)
  }
}
