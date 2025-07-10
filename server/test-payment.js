import { PaymentService } from './services/PaymentService.js'
import { logger } from './utils/logger.js'

async function testPaymentCreation() {
  try {
    console.log('🧪 Testing payment creation...')

    // Check environment variables
    console.log('Environment variables:')
    console.log(
      'CHAPA_AUTH_KEY:',
      process.env.CHAPA_AUTH_KEY ? '✅ Set' : '❌ Missing',
    )
    console.log('CALLBACK_URL:', process.env.CALLBACK_URL || '❌ Missing')
    console.log('BOT_RETURN_URL:', process.env.BOT_RETURN_URL || '❌ Missing')

    // Test payment creation
    const userId = 'user-123456'
    const amount = 100
    const mobile = '0912345678'

    console.log(
      `\nCreating payment for user: ${userId}, amount: ${amount}, mobile: ${mobile}`,
    )

    const payment = await PaymentService.createPayment(userId, amount, mobile)

    console.log('✅ Payment created successfully!')
    console.log('Payment data:', JSON.stringify(payment, null, 2))

    if (payment?.data?.checkout_url) {
      console.log('🔗 Payment URL:', payment.data.checkout_url)
    } else {
      console.log('❌ No payment URL received')
    }
  } catch (error) {
    console.error('❌ Payment creation failed:', error.message)
    console.error('Full error:', error)
  }
}

// Run the test
testPaymentCreation()
