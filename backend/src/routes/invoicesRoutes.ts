import { Router } from 'express';
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice
} from '../controllers/invoicesController.js';

const router = Router();

// GET /api/invoices - List all invoices
router.get('/', listInvoices);

// GET /api/invoices/:id - Get a single invoice
router.get('/:id', getInvoice);

// POST /api/invoices - Create a new invoice
router.post('/', createInvoice);

// PUT /api/invoices/:id - Update an invoice
router.put('/:id', updateInvoice);

// DELETE /api/invoices/:id - Delete an invoice
router.delete('/:id', deleteInvoice);

export default router;

