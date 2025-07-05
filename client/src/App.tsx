import { useState, useEffect } from 'react'

import './App.css'
import axios from 'axios'

function App() {
  const [form, setForm] = useState({
    amount: '',
    currency: 'ETB',
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState<number>(0)
  const [balanceLoading, setBalanceLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Fetch balance
  const fetchBalance = async () => {
    try {
      setBalanceLoading(true)
      const response = await axios.get(
        'https://chapa-auq6.onrender.com/balance',
      )
      if (response.data.success) {
        setBalance(response.data.data.balance)
      }
    } catch (error) {
      console.log('❌ Failed to fetch balance:', error)
    } finally {
      setBalanceLoading(false)
    }
  }

  // Fetch balance on component mount
  useEffect(() => {
    fetchBalance()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const tx_ref = `${form.first_name}-${Date.now()}`

    try {
      console.log('🚀 Sending payment request to backend...')
      const res = await axios.post(
        'https://chapa-auq6.onrender.com/accept-payment',
        {
          ...form,
          tx_ref,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )

      console.log('✅ Payment request successful:', res.data)

      if (res.data.data?.checkout_url) {
        window.location.href = res.data.data.checkout_url
      } else {
        setError('No checkout URL received from payment provider')
      }

      setForm({
        amount: '',
        currency: 'ETB',
        email: '',
        first_name: '',
        last_name: '',
        phone_number: '',
      })
    } catch (error: unknown) {
      console.log('❌ Payment request failed:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Payment request failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Payment Form
        </h1>

        {/* Balance Display */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-blue-800">
              Current Balance:
            </span>
            <div className="text-right">
              {balanceLoading ? (
                <span className="text-blue-600">Loading...</span>
              ) : (
                <span className="text-2xl font-bold text-blue-900">
                  {balance.toFixed(2)} ETB
                </span>
              )}
            </div>
          </div>
          <button
            onClick={fetchBalance}
            disabled={balanceLoading}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            🔄 Refresh Balance
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone_number"
              value={form.phone_number}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              name="currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ETB">ETB (Ethiopian Birr)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
