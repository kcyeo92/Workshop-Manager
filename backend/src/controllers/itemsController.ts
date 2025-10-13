import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to convert BigInt to number for JSON serialization
const serializeItem = (item: any) => {
  return {
    ...item,
    createdAt: Number(item.createdAt),
    updatedAt: Number(item.updatedAt),
    completedAt: item.completedAt ? Number(item.completedAt) : null,
    statusHistory: item.statusHistory?.map((sh: any) => ({
      ...sh,
      timestamp: Number(sh.timestamp)
    })),
    taskEvents: item.taskEvents?.map((te: any) => ({
      ...te,
      timestamp: Number(te.timestamp)
    }))
  };
};

// GET /api/items - List all items
export const listItems = async (_req: Request, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      include: {
        lineItems: true,
        workers: true,
        statusHistory: {
          orderBy: { timestamp: 'asc' }
        },
        taskEvents: {
          orderBy: { timestamp: 'asc' }
        },
        photos: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(items.map(serializeItem));
  } catch (error) {
    console.error('Error listing items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

// GET /api/items/:id - Get a single item
export const getItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await prisma.item.findUnique({
      where: { id: parseInt(id) },
      include: {
        lineItems: true,
        workers: true,
        statusHistory: {
          orderBy: { timestamp: 'asc' }
        },
        taskEvents: {
          orderBy: { timestamp: 'asc' }
        },
        photos: true
      }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(serializeItem(item));
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
};

// POST /api/items - Create a new item
export const createItem = async (req: Request, res: Response) => {
  try {
    const { 
      id,
      customer, 
      vehiclePlateNo, 
      vehicleMake, 
      vehicleModel,
      description,
      lineItems = [],
      workers = [],
      photos = []
    } = req.body;
    
    // Validate required fields
    if (!customer || !vehiclePlateNo || !vehicleMake || !vehicleModel) {
      return res.status(400).json({ 
        error: 'Customer, vehicle plate number, make, and model are required' 
      });
    }

    if (!id || typeof id !== 'number') {
      return res.status(400).json({ error: 'Valid ID is required' });
    }
    
    // Calculate total price from line items
    const totalPrice = lineItems.reduce((sum: number, li: any) => sum + (li.amount || 0), 0);
    
    // Calculate paid amount from workers
    const paidAmount = workers.reduce((sum: number, w: any) => sum + (w.wage || 0), 0);
    
    const now = Date.now();
    
    const item = await prisma.item.create({
      data: {
        id,
        customer: customer.trim(),
        vehiclePlateNo: vehiclePlateNo.trim(),
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        description: description?.trim() || null,
        status: 'todo',
        price: totalPrice,
        paid: paidAmount,
        createdAt: now,
        updatedAt: now,
        lineItems: {
          create: lineItems.map((li: any) => ({
            description: li.description.trim(),
            amount: parseFloat(li.amount)
          }))
        },
        workers: {
          create: workers.map((w: any) => ({
            name: w.name.trim(),
            wage: parseFloat(w.wage),
            paid: Boolean(w.paid)
          }))
        },
        statusHistory: {
          create: {
            status: 'todo',
            timestamp: now
          }
        },
        photos: {
          create: photos.map((p: any) => ({
            fileId: p.fileId,
            fileName: p.fileName,
            thumbnailLink: p.thumbnailLink,
            viewLink: p.viewLink
          }))
        }
      },
      include: {
        lineItems: true,
        workers: true,
        statusHistory: true,
        taskEvents: true,
        photos: true
      }
    });
    
    res.status(201).json(serializeItem(item));
  } catch (error: any) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item', details: error.message });
  }
};

// PATCH /api/items/:id - Update an item
export const updateItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id: parseInt(id) },
      include: {
        lineItems: true,
        workers: true,
        statusHistory: true
      }
    });
    
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const now = Date.now();
    const dataToUpdate: any = {
      updatedAt: now
    };
    
    // Handle simple field updates
    if (updates.customer !== undefined) dataToUpdate.customer = updates.customer.trim();
    if (updates.vehiclePlateNo !== undefined) dataToUpdate.vehiclePlateNo = updates.vehiclePlateNo.trim();
    if (updates.vehicleMake !== undefined) dataToUpdate.vehicleMake = updates.vehicleMake.trim();
    if (updates.vehicleModel !== undefined) dataToUpdate.vehicleModel = updates.vehicleModel.trim();
    if (updates.description !== undefined) dataToUpdate.description = updates.description?.trim() || null;
    
    // Handle status change
    if (updates.status && updates.status !== existingItem.status) {
      dataToUpdate.status = updates.status;
      
      // Add to status history
      dataToUpdate.statusHistory = {
        create: {
          status: updates.status,
          fromStatus: existingItem.status,
          timestamp: now
        }
      };
      
      // Set completedAt if moving to done
      if (updates.status === 'done') {
        dataToUpdate.completedAt = now;
      } else if (existingItem.status === 'done') {
        dataToUpdate.completedAt = null;
      }
    }
    
    // Handle lineItems update
    if (updates.lineItems) {
      // Delete old line items and create new ones
      await prisma.lineItem.deleteMany({
        where: { itemId: parseInt(id) }
      });
      
      dataToUpdate.lineItems = {
        create: updates.lineItems.map((li: any) => ({
          description: li.description.trim(),
          amount: parseFloat(li.amount)
        }))
      };
      
      // Recalculate price
      dataToUpdate.price = updates.lineItems.reduce((sum: number, li: any) => sum + (li.amount || 0), 0);
    }
    
    // Handle workers update
    if (updates.workers) {
      // Delete old workers and create new ones
      await prisma.taskWorker.deleteMany({
        where: { itemId: parseInt(id) }
      });
      
      dataToUpdate.workers = {
        create: updates.workers.map((w: any) => ({
          name: w.name.trim(),
          wage: parseFloat(w.wage),
          paid: Boolean(w.paid)
        }))
      };
      
      // Recalculate paid amount
      dataToUpdate.paid = updates.workers.reduce((sum: number, w: any) => sum + (w.wage || 0), 0);
    }
    
    const item = await prisma.item.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: {
        lineItems: true,
        workers: true,
        statusHistory: {
          orderBy: { timestamp: 'asc' }
        },
        taskEvents: true,
        photos: true
      }
    });
    
    res.json(serializeItem(item));
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
};

// DELETE /api/items/:id - Delete an item
export const deleteItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    await prisma.item.delete({
      where: { id: parseInt(id) }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};

// POST /api/items/:id/events - Add a task event
export const addTaskEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, timestamp, invoiceNumber } = req.body;
    
    // Validate required fields
    if (!type || !timestamp) {
      return res.status(400).json({ error: 'Event type and timestamp are required' });
    }
    
    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    await prisma.taskEvent.create({
      data: {
        itemId: parseInt(id),
        type,
        timestamp,
        invoiceNumber: invoiceNumber || null
      }
    });
    
    const item = await prisma.item.findUnique({
      where: { id: parseInt(id) },
      include: {
        lineItems: true,
        workers: true,
        statusHistory: {
          orderBy: { timestamp: 'asc' }
        },
        taskEvents: {
          orderBy: { timestamp: 'asc' }
        },
        photos: true
      }
    });
    
    res.json(serializeItem(item));
  } catch (error) {
    console.error('Error adding task event:', error);
    res.status(500).json({ error: 'Failed to add task event' });
  }
};

