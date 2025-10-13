import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/workers - List all workers
export const listWorkers = async (_req: Request, res: Response) => {
  try {
    const workers = await prisma.worker.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(workers);
  } catch (error) {
    console.error('Error listing workers:', error);
    res.status(500).json({ error: 'Failed to fetch workers' });
  }
};

// GET /api/workers/:id - Get a single worker
export const getWorker = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const worker = await prisma.worker.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    res.json(worker);
  } catch (error) {
    console.error('Error fetching worker:', error);
    res.status(500).json({ error: 'Failed to fetch worker' });
  }
};

// POST /api/workers - Create a new worker
export const createWorker = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, address, hourlyRate, notes, isActive } = req.body;
    
    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Worker name is required' });
    }
    
    // Check if worker name already exists
    const existingWorker = await prisma.worker.findUnique({
      where: { name: name.trim() }
    });
    
    if (existingWorker) {
      return res.status(400).json({ error: 'Worker with this name already exists' });
    }
    
    const worker = await prisma.worker.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
        notes: notes?.trim() || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });
    
    res.status(201).json(worker);
  } catch (error) {
    console.error('Error creating worker:', error);
    res.status(500).json({ error: 'Failed to create worker' });
  }
};

// PUT /api/workers/:id - Update a worker
export const updateWorker = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, hourlyRate, notes, isActive } = req.body;
    
    // Check if worker exists
    const existingWorker = await prisma.worker.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingWorker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    // If name is being updated, check for duplicates
    if (name && name.trim() !== existingWorker.name) {
      const duplicateWorker = await prisma.worker.findUnique({
        where: { name: name.trim() }
      });
      
      if (duplicateWorker) {
        return res.status(400).json({ error: 'Worker with this name already exists' });
      }
    }
    
    const worker = await prisma.worker.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(hourlyRate !== undefined && { hourlyRate: parseFloat(hourlyRate) }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        updatedAt: new Date()
      }
    });
    
    res.json(worker);
  } catch (error) {
    console.error('Error updating worker:', error);
    res.status(500).json({ error: 'Failed to update worker' });
  }
};

// DELETE /api/workers/:id - Delete a worker
export const deleteWorker = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if worker exists
    const existingWorker = await prisma.worker.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingWorker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    await prisma.worker.delete({
      where: { id: parseInt(id) }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting worker:', error);
    res.status(500).json({ error: 'Failed to delete worker' });
  }
};

