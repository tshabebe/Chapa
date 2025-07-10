import { Router } from 'express'
import { BalanceController } from '../controllers/BalanceController.js'

const router = Router()

// Get balance
router.get('/', (req, res) => {
  BalanceController.getBalance(req, res)
})

// Check balance
router.get('/check', (req, res) => {
  BalanceController.checkBalance(req, res)
})

// Increment balance
router.post('/increment', (req, res) => {
  BalanceController.incrementBalance(req, res)
})

// Decrement balance
router.post('/decrement', (req, res) => {
  BalanceController.decrementBalance(req, res)
})

// Get balance by user ID (parameterized route comes last)
router.get('/:userId', (req, res) => {
  BalanceController.getBalance(req, res)
})

export default router
