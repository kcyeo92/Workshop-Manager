import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/customers - List all customers
export const listCustomers = async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(customers);
  } catch (error) {
    console.error('Error listing customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

// GET /api/customers/:id - Get a single customer
export const getCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

// GET /api/customers/by-name/:name - Get customer by name
export const getCustomerByName = async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    
    // For SQLite, we need to fetch all and do case-insensitive match manually
    const customers = await prisma.customer.findMany();
    const customer = customers.find(c => c.name.toLowerCase() === name.toLowerCase());
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer by name:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

// POST /api/customers - Create a new customer
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, address, notes, isActive } = req.body;
    
    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    
    // Check if customer name already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { name: name.trim() }
    });
    
    if (existingCustomer) {
      return res.status(400).json({ error: 'Customer with this name already exists' });
    }
    
    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });
    
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

// PUT /api/customers/:id - Update a customer
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, notes, isActive } = req.body;
    
    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // If name is being updated, check for duplicates
    if (name && name.trim() !== existingCustomer.name) {
      const duplicateCustomer = await prisma.customer.findUnique({
        where: { name: name.trim() }
      });
      
      if (duplicateCustomer) {
        return res.status(400).json({ error: 'Customer with this name already exists' });
      }
    }
    
    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) })
      }
    });
    
    res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

// DELETE /api/customers/:id - Delete a customer
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    await prisma.customer.delete({
      where: { id: parseInt(id) }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

