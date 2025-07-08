import { WithdrawalService } from './services/withdrawalService.js'

async function testWithdrawal() {
  try {
    console.log('🧪 Testing Withdrawal Service...\n')

    // Test 1: Get banks
    console.log('1. Testing bank fetch...')
    const banks = await WithdrawalService.getBanks()
    console.log(`✅ Found ${banks.length} banks`)
    if (banks.length > 0) {
      console.log(`   First bank: ${banks[0].name} (Code: ${banks[0].code})`)
    }
    console.log()

    // Test 2: Check balance
    console.log('2. Testing balance check...')
    const hasBalance = await WithdrawalService.checkBalance('default-user', 100)
    console.log(
      `✅ Balance check result: ${hasBalance ? 'Sufficient' : 'Insufficient'}`,
    )
    console.log()

    // Test 3: Get withdrawal history
    console.log('3. Testing withdrawal history...')
    const history = await WithdrawalService.getWithdrawalHistory('default-user')
    console.log(`✅ Found ${history.length} withdrawal records`)
    console.log()

    console.log('🎉 All tests completed successfully!')
  } catch (error: any) {
    console.log('❌ Test failed:', error.message)
  }
}

// Run the test
testWithdrawal()
