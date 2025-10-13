import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/line-item-templates - List all line item templates
export const listLineItemTemplates = async (_req: Request, res: Response) => {
  try {
    const templates = await prisma.lineItemTemplate.findMany({
      orderBy: { description: 'asc' }
    });
    res.json(templates);
  } catch (error) {
    console.error('Error listing line item templates:', error);
    res.status(500).json({ error: 'Failed to fetch line item templates' });
  }
};

// GET /api/line-item-templates/:id - Get a single line item template
export const getLineItemTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = await prisma.lineItemTemplate.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Line item template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching line item template:', error);
    res.status(500).json({ error: 'Failed to fetch line item template' });
  }
};

// GET /api/line-item-templates/by-description/:description - Get template by description
export const getLineItemTemplateByDescription = async (req: Request, res: Response) => {
  try {
    const { description } = req.params;
    
    // For SQLite, we need to fetch all and do case-insensitive match manually
    const templates = await prisma.lineItemTemplate.findMany();
    const template = templates.find(t => t.description.toLowerCase() === description.toLowerCase());
    
    if (!template) {
      return res.status(404).json({ error: 'Line item template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching line item template by description:', error);
    res.status(500).json({ error: 'Failed to fetch line item template' });
  }
};

// POST /api/line-item-templates - Create a new line item template
export const createLineItemTemplate = async (req: Request, res: Response) => {
  try {
    const { description, category, isActive } = req.body;
    
    // Validate required fields
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    // Check if template with same description already exists
    const existingTemplate = await prisma.lineItemTemplate.findUnique({
      where: { description: description.trim() }
    });
    
    if (existingTemplate) {
      return res.status(400).json({ error: 'Line item template with this description already exists' });
    }
    
    const template = await prisma.lineItemTemplate.create({
      data: {
        description: description.trim(),
        category: category?.trim() || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });
    
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating line item template:', error);
    res.status(500).json({ error: 'Failed to create line item template' });
  }
};

// PUT /api/line-item-templates/:id - Update a line item template
export const updateLineItemTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, category, isActive } = req.body;
    
    // Check if template exists
    const existingTemplate = await prisma.lineItemTemplate.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingTemplate) {
      return res.status(404).json({ error: 'Line item template not found' });
    }
    
    // If description is being updated, check for duplicates
    if (description && description.trim() !== existingTemplate.description) {
      const duplicateTemplate = await prisma.lineItemTemplate.findUnique({
        where: { description: description.trim() }
      });
      
      if (duplicateTemplate) {
        return res.status(400).json({ error: 'Line item template with this description already exists' });
      }
    }
    
    const template = await prisma.lineItemTemplate.update({
      where: { id: parseInt(id) },
      data: {
        ...(description && { description: description.trim() }),
        ...(category !== undefined && { category: category?.trim() || null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) })
      }
    });
    
    res.json(template);
  } catch (error) {
    console.error('Error updating line item template:', error);
    res.status(500).json({ error: 'Failed to update line item template' });
  }
};

// DELETE /api/line-item-templates/:id - Delete a line item template
export const deleteLineItemTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if template exists
    const existingTemplate = await prisma.lineItemTemplate.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingTemplate) {
      return res.status(404).json({ error: 'Line item template not found' });
    }
    
    await prisma.lineItemTemplate.delete({
      where: { id: parseInt(id) }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting line item template:', error);
    res.status(500).json({ error: 'Failed to delete line item template' });
  }
};

