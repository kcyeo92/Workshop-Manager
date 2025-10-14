import { Router } from 'express';
import workersRoutes from './routes/workersRoutes.js';
import itemsRoutes from './routes/itemsRoutes.js';
import customersRoutes from './routes/customersRoutes.js';
import invoicesRoutes from './routes/invoicesRoutes.js';
import lineItemTemplatesRoutes from './routes/lineItemTemplatesRoutes.js';
import photosRoutes from './routes/photosRoutes.js';

export const router = Router();

// Mount routes
router.use('/workers', workersRoutes);
router.use('/items', itemsRoutes);
router.use('/customers', customersRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/line-item-templates', lineItemTemplatesRoutes);
router.use('/photos', photosRoutes);
