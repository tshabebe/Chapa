import { Router } from 'express'
import { BalanceController } from '../controllers/BalanceController.js'

const router = Router()

// Get balance
router.get('/', BalanceController.getBalance)
router.get('/:userId', BalanceController.getBalance)

// Increment balance
router.post('/increment', BalanceController.incrementBalance)

// Decrement balance
router.post('/decrement', BalanceController.decrementBalance)

// Check balance
router.get('/check', BalanceController.checkBalance)

export default router
