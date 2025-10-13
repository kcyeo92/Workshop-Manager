import { Router } from 'express';
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  addTaskEvent
} from '../controllers/itemsController.js';

const router = Router();

// GET /api/items - List all items
router.get('/', listItems);

// GET /api/items/:id - Get a single item
router.get('/:id', getItem);

// POST /api/items - Create a new item
router.post('/', createItem);

// PATCH /api/items/:id - Update an item
router.patch('/:id', updateItem);

// DELETE /api/items/:id - Delete an item
router.delete('/:id', deleteItem);

// POST /api/items/:id/events - Add a task event
router.post('/:id/events', addTaskEvent);

export default router;

