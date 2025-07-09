import type { Request } from 'express'
import axios from 'axios'
import crypto from 'crypto'

const CHAPA_AUTH_KEY = process.env.CHAPA_AUTH_KEY

export interface PaymentRequest {
  amount: string
  currency: string
  email: string
  first_name: string
  last_name: string
  phone_number: string
  tx_ref: string
  return_url?: string
  callback_url?: string
}

export class PaymentService {
  // Initialize payment with Chapa
  static async initializePayment(request: PaymentRequest) {
    try {
      const requestPayload = {
        amount: request.amount,
        currency: request.currency,
        email: request.email,
        first_name: request.first_name,
        last_name: request.last_name,
        phone_number: request.phone_number,
        tx_ref: request.tx_ref,
        return_url: request.return_url,
        callback_url: request.callback_url,
        'customization[title]': 'Payment for My App',
        'customization[description]': 'Thank you for your payment',
        'meta[hide_receipt]': 'false',
      }

      console.log('📤 Sending request to Chapa:', requestPayload)

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

      console.log('✅ Chapa API response:', response.data)

      if (!response.data.data?.checkout_url) {
        throw new Error('No payment URL received from Chapa API')
      }

      return response.data
    } catch (error: any) {
      console.log('❌ Payment initialization error:', error.message)
      throw new Error(`Payment initialization failed: ${error.message}`)
    }
  }

  // Verify webhook signature
  static verifyWebhookSignature(req: Request, webhookSecret: string): boolean {
    try {
      const chapaSignature = req.headers['chapa-signature'] as string
      const xChapaSignature = req.headers['x-chapa-signature'] as string

      const payload = JSON.stringify(req.body)
      const expectedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex')

      const isChapaSignatureValid = chapaSignature === expectedHash
      const isXChapaSignatureValid = xChapaSignature === expectedHash

      return isChapaSignatureValid || isXChapaSignatureValid
    } catch (error: any) {
      console.log('❌ Webhook signature verification error:', error.message)
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

      console.log('✅ Verification response:', response.data)
      return response.data
    } catch (error: any) {
      console.log('❌ Transaction verification error:', error.message)
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
      console.log('❌ Payment status error:', error.message)
      throw new Error(`Failed to get payment status: ${error.message}`)
    }
  }

  // Create payment (alias for initializePayment for backward compatibility)
  static async createPayment(userId: string, amount: number, mobile: string) {
    const tx_ref = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const request: PaymentRequest = {
      amount: amount.toString(),
      currency: 'ETB',
      email: `${userId}@example.com`,
      first_name: userId,
      last_name: 'User',
      phone_number: mobile,
      tx_ref,
    }
    return this.initializePayment(request)
  }
}
