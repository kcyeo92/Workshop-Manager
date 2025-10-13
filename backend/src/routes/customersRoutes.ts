import { Router } from 'express';
import {
  listCustomers,
  getCustomer,
  getCustomerByName,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '../controllers/customersController.js';

const router = Router();

// GET /api/customers - List all customers
router.get('/', listCustomers);

// GET /api/customers/by-name/:name - Get customer by name
router.get('/by-name/:name', getCustomerByName);

// GET /api/customers/:id - Get a single customer
router.get('/:id', getCustomer);

// POST /api/customers - Create a new customer
router.post('/', createCustomer);

// PUT /api/customers/:id - Update a customer
router.put('/:id', updateCustomer);

// DELETE /api/customers/:id - Delete a customer
router.delete('/:id', deleteCustomer);

export default router;

