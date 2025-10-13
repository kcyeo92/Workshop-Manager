import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to serialize BigInt fields
const serializeInvoice = (invoice: any) => ({
  ...invoice,
  createdAt: Number(invoice.createdAt),
  updatedAt: Number(invoice.updatedAt),
  paymentReceivedDate: invoice.paymentReceivedDate ? Number(invoice.paymentReceivedDate) : undefined,
  taskIds: JSON.parse(invoice.taskIds),
  tasks: JSON.parse(invoice.tasksSnapshot)
});

// Generate next invoice ID (format: yy0001)
const getNextInvoiceId = async (): Promise<string> => {
  const currentYear = new Date().getFullYear().toString().slice(-2); // Last 2 digits of year
  
  // Get or create sequence
  let sequenceRecord = await prisma.invoiceSequence.findUnique({ where: { id: 1 } });
  
  if (!sequenceRecord) {
    sequenceRecord = await prisma.invoiceSequence.create({
      data: { id: 1, sequence: 1 }
    });
  } else {
    sequenceRecord = await prisma.invoiceSequence.update({
      where: { id: 1 },
      data: { sequence: { increment: 1 } }
    });
  }
  
  // Format: yy0001, yy0002, etc.
  const paddedSequence = sequenceRecord.sequence.toString().padStart(4, '0');
  return `${currentYear}${paddedSequence}`;
};

// GET /api/invoices - List all invoices
export const listInvoices = async (_req: Request, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    const serialized = invoices.map(serializeInvoice);
    res.json(serialized);
  } catch (error) {
    console.error('Error listing invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

// GET /api/invoices/:id - Get a single invoice
export const getInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id }
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json(serializeInvoice(invoice));
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

// POST /api/invoices - Create a new invoice
export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { taskIds, customerName, totalAmount, tasks } = req.body;
    
    // Validate required fields
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'Task IDs are required' });
    }
    if (!customerName || typeof customerName !== 'string') {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    if (typeof totalAmount !== 'number') {
      return res.status(400).json({ error: 'Total amount is required' });
    }
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Tasks snapshot is required' });
    }
    
    const invoiceId = await getNextInvoiceId();
    const now = Date.now();
    
    const invoice = await prisma.invoice.create({
      data: {
        id: invoiceId,
        taskIds: JSON.stringify(taskIds),
        customerName,
        totalAmount,
        tasksSnapshot: JSON.stringify(tasks),
        paymentReceived: false,
        createdAt: BigInt(now),
        updatedAt: BigInt(now)
      }
    });
    
    res.status(201).json(serializeInvoice(invoice));
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ 
      error: 'Failed to create invoice',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

// PUT /api/invoices/:id - Update an invoice
export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentReceived, paymentReceivedDate } = req.body;
    
    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id }
    });
    
    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const updateData: any = {
      updatedAt: BigInt(Date.now())
    };
    
    if (paymentReceived !== undefined) {
      updateData.paymentReceived = Boolean(paymentReceived);
    }
    
    if (paymentReceivedDate !== undefined) {
      updateData.paymentReceivedDate = paymentReceivedDate ? BigInt(paymentReceivedDate) : null;
    }
    
    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData
    });
    
    res.json(serializeInvoice(invoice));
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ 
      error: 'Failed to update invoice',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

// DELETE /api/invoices/:id - Delete an invoice
export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id }
    });
    
    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    await prisma.invoice.delete({
      where: { id }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
};

