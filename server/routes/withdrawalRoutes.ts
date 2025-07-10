import { Router } from 'express'
import { WithdrawalController } from '../controllers/WithdrawalController.js'

const router = Router()

// Get available banks
router.get('/banks', (req, res) => {
  WithdrawalController.getBanks(req, res)
})

// Initiate withdrawal
router.post('/initiate', (req, res) => {
  WithdrawalController.initiateWithdrawal(req, res)
})

// Verify withdrawal
router.get('/verify/:reference', (req, res) => {
  WithdrawalController.verifyWithdrawal(req, res)
})

// Get withdrawal history
router.get('/history', (req, res) => {
  WithdrawalController.getWithdrawalHistory(req, res)
})

router.get('/history/:userId', (req, res) => {
  WithdrawalController.getWithdrawalHistory(req, res)
})

// Get withdrawal by reference (specific route for direct reference lookup)
router.get('/reference/:reference', (req, res) => {
  WithdrawalController.getWithdrawalByReference(req, res)
})

export default router
