import { WithdrawalService } from './services/withdrawalService.js'

/**
 * Automated withdrawal status checker
 * Since Chapa doesn't provide webhooks for transfers,
 * you can use this script to periodically check withdrawal statuses
 */

async function checkPendingWithdrawals() {
  try {
    console.log('🔍 Checking pending withdrawals...')

    const withdrawals = await WithdrawalService.getWithdrawalHistory(
      'default-user',
    )
    const pendingWithdrawals = withdrawals.filter(
      (w) => w.status === 'pending' || w.status === 'processing',
    )

    if (pendingWithdrawals.length === 0) {
      console.log('✅ No pending withdrawals found')
      return
    }

    console.log(`📋 Found ${pendingWithdrawals.length} pending withdrawals`)

    for (const withdrawal of pendingWithdrawals) {
      try {
        console.log(`🔍 Checking withdrawal: ${withdrawal.reference}`)

        const result = await WithdrawalService.verifyWithdrawal(
          withdrawal.reference,
        )

        if (result.data?.status && result.data.status !== withdrawal.status) {
          console.log(
            `✅ Status updated: ${withdrawal.status} → ${result.data.status}`,
          )

          // You could send a notification here
          // await sendTelegramNotification(userId, `Withdrawal ${withdrawal.reference} status: ${result.data.status}`)
        } else {
          console.log(`⏳ Status unchanged: ${withdrawal.status}`)
        }

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error: any) {
        console.log(
          `❌ Error checking withdrawal ${withdrawal.reference}:`,
          error.message,
        )
      }
    }
  } catch (error: any) {
    console.log('❌ Error in withdrawal check:', error.message)
  }
}

// Run the check
checkPendingWithdrawals()

// Example: Set up periodic checking (uncomment to use)
/*
setInterval(checkPendingWithdrawals, 5 * 60 * 1000) // Check every 5 minutes
console.log('🤖 Automated withdrawal checker started (every 5 minutes)')
*/
