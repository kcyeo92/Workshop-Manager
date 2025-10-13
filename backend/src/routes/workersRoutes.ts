import { Router } from 'express';
import {
  listWorkers,
  getWorker,
  createWorker,
  updateWorker,
  deleteWorker
} from '../controllers/workersController.js';

const router = Router();

// GET /api/workers - List all workers
router.get('/', listWorkers);

// GET /api/workers/:id - Get a single worker
router.get('/:id', getWorker);

// POST /api/workers - Create a new worker
router.post('/', createWorker);

// PUT /api/workers/:id - Update a worker
router.put('/:id', updateWorker);

// DELETE /api/workers/:id - Delete a worker
router.delete('/:id', deleteWorker);

export default router;

