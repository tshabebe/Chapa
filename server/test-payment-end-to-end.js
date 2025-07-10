import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000'
const CHAPA_AUTH_KEY = process.env.CHAPA_AUTH_KEY

async function testPaymentFlow() {
  console.log('🧪 Testing complete payment flow...')

  try {
    // Test 1: Check if server is running
    console.log('🔍 Testing server connectivity...')
    const healthResponse = await axios.get(`${BASE_URL}/`)
    console.log('✅ Server is running:', healthResponse.data)

    // Test 2: Create a payment through the API
    console.log('💳 Testing payment creation...')
    const paymentData = {
      amount: '50',
      currency: 'ETB',
      phone_number: '+251912345678',
      tx_ref: `test_${Date.now()}`,
      userId: 12345,
      callback_url: `${BASE_URL}/callback`,
      return_url: `${BASE_URL}/success`,
    }

    const paymentResponse = await axios.post(
      `${BASE_URL}/api/payments/initialize`,
      paymentData,
    )
    console.log('✅ Payment created successfully:', paymentResponse.data)

    if (paymentResponse.data.data?.checkout_url) {
      console.log('🔗 Payment URL:', paymentResponse.data.data.checkout_url)
    }

    // Test 3: Check payment status
    console.log('📊 Testing payment status check...')
    const statusResponse = await axios.get(
      `${BASE_URL}/api/payments/status/${paymentData.tx_ref}`,
    )
    console.log('✅ Payment status retrieved:', statusResponse.data)

    // Test 4: Test webhook simulation (this would normally come from Chapa)
    console.log('🔔 Testing webhook simulation...')
    const webhookData = {
      tx_ref: paymentData.tx_ref,
      status: 'success',
      event: 'charge.success',
      currency: 'ETB',
      amount: '50',
    }

    const webhookResponse = await axios.post(
      `${BASE_URL}/callback`,
      webhookData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
    console.log('✅ Webhook processed successfully:', webhookResponse.data)

    // Test 5: Check balance after webhook
    console.log('💰 Testing balance check...')
    const balanceResponse = await axios.get(
      `${BASE_URL}/api/balance/${paymentData.userId}`,
    )
    console.log('✅ Balance retrieved:', balanceResponse.data)

    console.log('🎉 All payment flow tests passed!')
  } catch (error) {
    console.error('❌ Payment flow test failed:', error.message)
    if (error.response) {
      console.error('Response data:', error.response.data)
      console.error('Response status:', error.response.status)
    }
  }
}

testPaymentFlow()
