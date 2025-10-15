type StatusHistory = {
  status: 'todo' | 'assigned' | 'processing' | 'done';
  timestamp: number;
  fromStatus?: 'todo' | 'assigned' | 'processing' | 'done';
};

type TaskEvent = {
  type: 'invoice_generated' | 'payment_received';
  timestamp: number;
  invoiceNumber?: string;
};

export type LineItem = {
  description: string;
  amount: number;
};

export type Worker = {
  name: string;
  wage: number;
  paid: boolean;
};

export type { StatusHistory, TaskEvent };

export type Photo = {
  fileId: string;
  fileName: string;
  thumbnailLink: string;
  viewLink: string;
};

export type Item = { 
  id: number; // Format: yyyymmddNN (e.g., 2025101101, 2025101102)
  status: 'todo' | 'assigned' | 'processing' | 'done';
  customer: string;
  vehiclePlateNo: string;
  vehicleMake: string;
  vehicleModel: string;
  description?: string; // Optional additional details
  lineItems: LineItem[];
  price: number; // Total price (calculated from lineItems)
  workers?: Worker[]; // Array of workers with their wages
  paid?: number;
  completedAt?: number; // Unix timestamp in milliseconds
  createdAt: number; // Unix timestamp in milliseconds
  statusHistory: StatusHistory[]; // Track all status changes
  taskEvents?: TaskEvent[]; // Track invoice generation and payment events
  photos?: Photo[]; // Google Drive photos
};

const STORAGE_KEY = 'mock_items_v1';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

function isMockEnabled(): boolean {
  // Enable by setting VITE_USE_MOCK=true in .env.local
  return String(import.meta.env.VITE_USE_MOCK).toLowerCase() === 'true';
}

function readMock(): Item[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const items = JSON.parse(raw) as any[];
    
    // Add backward compatibility for items without createdAt, statusHistory, lineItems, or workers
    const now = Date.now();
    return items.map(item => ({
      ...item,
      createdAt: item.createdAt || now,
      statusHistory: item.statusHistory || [{ status: item.status, timestamp: now }],
      lineItems: item.lineItems || (item.price ? [{ description: 'Service', amount: item.price }] : []),
      price: item.price || item.lineItems?.reduce((sum: number, li: LineItem) => sum + li.amount, 0) || 0,
      // Convert old workers format to new format with wages and paid status
      workers: item.workers 
        ? (Array.isArray(item.workers) && item.workers.length > 0
            ? (typeof item.workers[0] === 'string' 
                ? item.workers.map((w: string) => ({ name: w, wage: 0, paid: false })) 
                : item.workers.map((w: any) => ({ 
                    name: w.name, 
                    wage: w.wage || 0, 
                    paid: w.paid !== undefined ? w.paid : false 
                  })))
            : [])
        : (item.worker ? [{ name: item.worker, wage: 0, paid: false }] : [])
    }));
  } catch {
    return [];
  }
}

function writeMock(items: Item[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function nextId(existingItems: Item[]): number {
  // Get today's date in yyyymmdd format
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = parseInt(`${year}${month}${day}`);
  
  // Find all items with today's date prefix (yyyymmdd)
  const todayItems = existingItems.filter(item => {
    const itemPrefix = Math.floor(item.id / 100); // Get yyyymmdd part
    return itemPrefix === datePrefix;
  });
  
  // Find the highest number suffix (NN) used today
  let maxNumber = 0;
  todayItems.forEach(item => {
    const numberSuffix = item.id % 100; // Get NN part
    if (numberSuffix > maxNumber) {
      maxNumber = numberSuffix;
    }
  });
  
  // Next number is max + 1
  const nextNumber = maxNumber + 1;
  const numberSuffix = String(nextNumber).padStart(2, '0');
  
  return parseInt(`${datePrefix}${numberSuffix}`);
}

export async function listItems(): Promise<Item[]> {
  if (isMockEnabled()) {
    return readMock();
  }
  const res = await fetch(`${API_BASE_URL}/items`);
  if (!res.ok) throw new Error('Failed to fetch items');
  return res.json();
}

export async function createItem(itemData: Omit<Item, 'id' | 'status' | 'createdAt' | 'statusHistory' | 'price'>): Promise<Item> {
  if (isMockEnabled()) {
    const items = readMock();
    const now = Date.now();
    // Calculate total price from line items
    const totalPrice = itemData.lineItems.reduce((sum, li) => sum + li.amount, 0);
    const item: Item = { 
      id: nextId(items), 
      ...itemData, 
      status: 'todo',
      price: totalPrice,
      createdAt: now,
      statusHistory: [{ status: 'todo', timestamp: now }]
    };
    const updated = [item, ...items];
    writeMock(updated);
    return item;
  }
  
  // For backend, fetch existing items to generate next ID
  const existingResponse = await fetch(`${API_BASE_URL}/items`);
  const existingItems = existingResponse.ok ? await existingResponse.json() : [];
  const id = nextId(existingItems);
  
  const res = await fetch(`${API_BASE_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      ...itemData,
      workers: itemData.workers || [],
      photos: itemData.photos || []
    })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.details || error.error || 'Failed to create item');
  }
  return res.json();
}

export async function updateItem(id: number, updates: Partial<Pick<Item, 'status' | 'customer' | 'vehiclePlateNo' | 'vehicleMake' | 'vehicleModel' | 'description' | 'lineItems' | 'workers' | 'paid'>>): Promise<Item> {
  if (isMockEnabled()) {
    const items = readMock();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Item not found');
    
    const currentItem = items[idx];
    const now = Date.now();
    
    // Track status changes and set completedAt
    const additionalUpdates: Partial<Item> = {};
    
    // If lineItems are updated, recalculate total price
    if (updates.lineItems) {
      additionalUpdates.price = updates.lineItems.reduce((sum, li) => sum + li.amount, 0);
    }
    
    // If status is changing, add to history
    if (updates.status && updates.status !== currentItem.status) {
      const newHistoryEntry: StatusHistory = {
        status: updates.status,
        timestamp: now,
        fromStatus: currentItem.status
      };
      additionalUpdates.statusHistory = [...currentItem.statusHistory, newHistoryEntry];
      
      // If moving to "done", set completedAt timestamp
      if (updates.status === 'done') {
        additionalUpdates.completedAt = now;
      }
      // If moving away from "done", clear completedAt
      else if (currentItem.status === 'done') {
        additionalUpdates.completedAt = undefined;
      }
    }
    
    const updated: Item = { ...currentItem, ...updates, ...additionalUpdates };
    const merged = [...items];
    merged[idx] = updated;
    writeMock(merged);
    return updated;
  }
  const res = await fetch(`${API_BASE_URL}/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update item');
  return res.json();
}

export async function deleteItem(id: number): Promise<void> {
  if (isMockEnabled()) {
    const items = readMock();
    writeMock(items.filter(i => i.id !== id));
    return;
  }
  const res = await fetch(`${API_BASE_URL}/items/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete item');
}

export async function addTaskEvent(id: number, event: TaskEvent): Promise<Item> {
  if (isMockEnabled()) {
    const items = readMock();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Item not found');
    
    const currentItem = items[idx];
    const updatedItem = {
      ...currentItem,
      taskEvents: [...(currentItem.taskEvents || []), event]
    };
    
    items[idx] = updatedItem;
    writeMock(items);
    return updatedItem;
  }
  
  const res = await fetch(`${API_BASE_URL}/items/${id}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });
  if (!res.ok) throw new Error('Failed to add task event');
  return res.json();
}


