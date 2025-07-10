import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Payment from './models/Payment.js'
import Balance from './models/Balance.js'

dotenv.config()

const MONGODB_URL = process.env.MONGODB_URL

async function testDatabase() {
  console.log('🧪 Testing database connectivity and functionality...')

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(
      MONGODB_URL || 'mongodb://localhost:27017/chapa-payments',
    )
    console.log('✅ Connected to MongoDB successfully')

    // Test payment creation
    console.log('💾 Testing payment creation...')
    const testPayment = await Payment.createPayment({
      userId: 12345,
      tx_ref: `test_${Date.now()}`,
      amount: 100,
      currency: 'ETB',
      metadata: {
        phoneNumber: '+251912345678',
      },
    })
    console.log('✅ Payment created successfully:', testPayment._id)

    // Test balance creation
    console.log('💰 Testing balance creation...')
    const testBalance = await Balance.getOrCreateBalance('12345')
    console.log(
      '✅ Balance created/retrieved successfully:',
      testBalance.balance,
    )

    // Test balance increment
    console.log('📈 Testing balance increment...')
    const newBalance = await testBalance.incrementBalance(50)
    console.log('✅ Balance incremented successfully:', newBalance.balance)

    // Test payment retrieval
    console.log('🔍 Testing payment retrieval...')
    const foundPayment = await Payment.findByTxRef(testPayment.tx_ref)
    console.log(
      '✅ Payment retrieved successfully:',
      foundPayment ? 'Found' : 'Not found',
    )

    // Clean up test data
    console.log('🧹 Cleaning up test data...')
    await Payment.deleteOne({ _id: testPayment._id })
    await Balance.deleteOne({ userId: '12345' })
    console.log('✅ Test data cleaned up')

    console.log('🎉 All database tests passed!')
  } catch (error) {
    console.error('❌ Database test failed:', error.message)
    console.error('Stack trace:', error.stack)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

testDatabase()
