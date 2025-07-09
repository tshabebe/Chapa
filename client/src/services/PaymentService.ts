import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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

export interface PaymentResponse {
  success: boolean
  message: string
  data?: {
    checkout_url?: string
    [key: string]: any
  }
}

export interface BalanceResponse {
  success: boolean
  message: string
  data: {
    balance: number
    currency: string
    lastUpdated: string
  }
}

export class PaymentService {
  // Initialize payment
  static async initializePayment(
    request: PaymentRequest,
  ): Promise<PaymentResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/payments/initialize`,
        request,
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
      return response.data
    } catch (error: any) {
      console.log('❌ Payment initialization error:', error.message)
      throw new Error(
        error.response?.data?.message || 'Payment initialization failed',
      )
    }
  }

  // Get balance
  static async getBalance(userId?: string): Promise<BalanceResponse> {
    try {
      const url = userId
        ? `${API_BASE_URL}/api/balance/${userId}`
        : `${API_BASE_URL}/api/balance`

      const response = await axios.get(url)
      return response.data
    } catch (error: any) {
      console.log('❌ Balance fetch error:', error.message)
      throw new Error(
        error.response?.data?.message || 'Failed to fetch balance',
      )
    }
  }

  // Get payment status
  static async getPaymentStatus(tx_ref: string): Promise<PaymentResponse> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/payments/status/${tx_ref}`,
      )
      return response.data
    } catch (error: any) {
      console.log('❌ Payment status error:', error.message)
      throw new Error(
        error.response?.data?.message || 'Failed to get payment status',
      )
    }
  }
}
