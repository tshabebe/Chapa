import { Router } from 'express'
import { BalanceController } from '../controllers/BalanceController.js'

const router = Router()

// Get balance
router.get('/', BalanceController.getBalance)

// Check balance (specific route must come before parameterized route)
router.get('/check', BalanceController.checkBalance)

// Get balance by user ID (parameterized route comes last)
router.get('/:userId', BalanceController.getBalance)

// Increment balance
router.post('/increment', BalanceController.incrementBalance)

// Decrement balance
router.post('/decrement', BalanceController.decrementBalance)

export default router
