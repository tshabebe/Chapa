import { useState } from 'react'
import { PaymentForm } from '../components/PaymentForm.js'
import { BalanceDisplay } from '../components/BalanceDisplay.js'
import { PaymentService } from '../services/PaymentService.js'

export function PaymentView() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState<number>(0)
  const [balanceLoading, setBalanceLoading] = useState(false)

  const handlePaymentSubmit = async (formData: any) => {
    setLoading(true)
    setError('')

    const tx_ref = `${formData.first_name}-${Date.now()}`

    try {
      console.log('🚀 Sending payment request to backend...')
      const response = await PaymentService.initializePayment({
        ...formData,
        tx_ref,
      })

      console.log('✅ Payment request successful:', response)

      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url
      } else {
        setError('No checkout URL received from payment provider')
      }
    } catch (error: unknown) {
      console.log('❌ Payment request failed:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Payment request failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleBalanceRefresh = async () => {
    try {
      setBalanceLoading(true)
      const response = await PaymentService.getBalance()
      if (response.success) {
        setBalance(response.data.balance)
      }
    } catch (error) {
      console.log('❌ Failed to fetch balance:', error)
    } finally {
      setBalanceLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Payment Form
        </h1>

        <BalanceDisplay
          balance={balance}
          loading={balanceLoading}
          onRefresh={handleBalanceRefresh}
        />

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <PaymentForm onSubmit={handlePaymentSubmit} loading={loading} />
      </div>
    </div>
  )
}
