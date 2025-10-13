import { Router } from 'express';
import {
  listLineItemTemplates,
  getLineItemTemplate,
  getLineItemTemplateByDescription,
  createLineItemTemplate,
  updateLineItemTemplate,
  deleteLineItemTemplate
} from '../controllers/lineItemTemplatesController.js';

const router = Router();

// GET /api/line-item-templates - List all templates
router.get('/', listLineItemTemplates);

// GET /api/line-item-templates/by-description/:description - Get by description
router.get('/by-description/:description', getLineItemTemplateByDescription);

// GET /api/line-item-templates/:id - Get a single template
router.get('/:id', getLineItemTemplate);

// POST /api/line-item-templates - Create a new template
router.post('/', createLineItemTemplate);

// PUT /api/line-item-templates/:id - Update a template
router.put('/:id', updateLineItemTemplate);

// DELETE /api/line-item-templates/:id - Delete a template
router.delete('/:id', deleteLineItemTemplate);

export default router;

