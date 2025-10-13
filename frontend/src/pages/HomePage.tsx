import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { listItems, updateItem, deleteItem, type Item } from '../api/items'
import TaskViewModal from '../components/TaskViewModal'
import AddTaskModal from '../components/AddTaskModal'
import WorkerAssignmentModal from '../components/WorkerAssignmentModal'
import '../App.css'

const COLUMNS = [
  { id: 'todo', title: 'Todo' },
  { id: 'assigned', title: 'Assigned' },
  { id: 'processing', title: 'Processing' },
  { id: 'done', title: 'Done' }
] as const

type ColumnId = typeof COLUMNS[number]['id']

export default function HomePage() {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [pendingDragTask, setPendingDragTask] = useState<Item | null>(null);
  const queryClient = useQueryClient()

  const itemsQuery = useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: () => listItems(),
  })

  // Remove createMutation since it's now handled in AddTaskModal

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; status: ColumnId }) => updateItem(vars.id, { status: vars.status }),
    // No onSuccess needed - we're using optimistic updates
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  })

  const items = itemsQuery.data ?? []
  
  // Get the selected task from the latest data (always fresh)
  const selectedTask = selectedTaskId ? items.find(item => item.id === selectedTaskId) || null : null

  const TWO_MINUTES = 2 * 60 * 1000 // 2 minutes in milliseconds

  // Filter out completed tasks older than 2 minutes from Kanban board display
  const visibleItems = items.filter(item => {
    if (item.status === 'done' && item.completedAt) {
      const timeElapsed = Date.now() - item.completedAt
      return timeElapsed < TWO_MINUTES // Only show if less than 2 minutes old
    }
    return true // Show all non-completed tasks
  })

  const getItemsByStatus = (status: ColumnId) => visibleItems.filter(item => item.status === status)

  // Re-render when items in "done" should be hidden
  useEffect(() => {
    const doneItems = items.filter(item => item.status === 'done' && item.completedAt)
    
    if (doneItems.length === 0) return

    // Find the next item to expire
    const timers = doneItems.map(item => {
      const timeElapsed = Date.now() - (item.completedAt || 0)
      const timeRemaining = TWO_MINUTES - timeElapsed

      if (timeRemaining > 0) {
        // Schedule a re-render when this item should be hidden
        return setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['items'] })
        }, timeRemaining)
      }
      return null
    })

    // Cleanup timers on unmount or when dependencies change
    return () => {
      timers.forEach(timer => {
        if (timer) clearTimeout(timer)
      })
    }
  }, [items, queryClient])

  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const itemId = parseInt(draggableId)
    const newStatus = destination.droppableId as ColumnId
    
    // Find the task being moved
    const task = items.find(item => item.id === itemId)
    if (!task) return
    
    // If moving to "assigned" column, prompt for worker assignment
    if (newStatus === 'assigned') {
      setPendingDragTask(task)
      setIsWorkerModalOpen(true)
      return
    }
    
    // For other columns, proceed with normal update
    // Optimistic update - immediately update the UI
    queryClient.setQueryData(['items'], (oldItems: Item[] = []) => {
      return oldItems.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      )
    })
    
    // Then make the API call in the background
    updateMutation.mutate({ id: itemId, status: newStatus }, {
      onError: () => {
        // Rollback on error - revert the optimistic update
        queryClient.invalidateQueries({ queryKey: ['items'] })
      }
    })
  }

  const handleTaskClick = (task: Item) => {
    setSelectedTaskId(task.id)
    setIsModalOpen(true)
    console.log('Modal should be open now')
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedTaskId(null)
  }

  const handleWorkerModalClose = () => {
    setIsWorkerModalOpen(false)
    setPendingDragTask(null)
  }

  const handleWorkerAssignmentSuccess = () => {
    // Worker assignment was successful, the modal will close automatically
    setPendingDragTask(null)
  }

  return (
    <div className="App">
      
        {/* Add new task button */}
        <div className="add-task-section">
          <button
            className="add-task-button"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Add New Task
          </button>
        </div>

      {itemsQuery.isLoading ? <div>Loading...</div> : null}
      {itemsQuery.error ? <div style={{ color: 'crimson' }}>{(itemsQuery.error as Error).message}</div> : null}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {COLUMNS.map(column => (
            <div key={column.id} className="kanban-column">
              <h3 className="column-header">
                {column.title}
              </h3>
              
              <Droppable droppableId={column.id}>
                {(provided: any, snapshot: any) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="column-content"
                    style={{
                      backgroundColor: snapshot.isDraggingOver ? '#e3f2fd' : '#f8f9fa',
                    }}
                  >
                    {getItemsByStatus(column.id).map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
                        {(provided: any, snapshot: any) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`task-card ${column.id === 'done' ? 'task-completed' : ''}`}
                              style={{
                                ...provided.draggableProps.style,
                                backgroundColor: snapshot.isDragging ? '#fff3cd' : (column.id === 'done' ? '#f8f9fa' : 'white'),
                                boxShadow: snapshot.isDragging ? '0 4px 8px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.1)',
                              }}
                            >
                            <div className="task-content">
                              <div 
                                className={`task-info ${column.id === 'done' ? 'task-text-completed' : ''}`}
                                onClick={() => handleTaskClick(item)}
                              >
                                <div className="task-title">{item.customer}</div>
                                <div className="task-detail">Vehicle: {(item.vehicleMake || 'N/A')} {(item.vehicleModel || 'N/A')}</div>
                                <div className="task-detail">Plate: {item.vehiclePlateNo || 'N/A'}</div>
                                <div className={`task-price ${column.id === 'done' ? 'task-price-completed' : ''}`}>Price: ${item.price || 0}</div>
                                {item.workers && item.workers.length > 0 && <div className={`task-worker ${column.id === 'done' ? 'task-worker-completed' : ''}`}>Workers: {item.workers.map(w => `${w.name} ($${w.wage})`).join(', ')}</div>}
                              </div>
                              {column.id === 'todo' && (
                                <button
                                  className="delete-button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteMutation.mutate(item.id)
                                  }}
                                  disabled={deleteMutation.isPending}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Task Detail Modal */}
      <TaskViewModal 
        task={selectedTask} 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
      />

      {/* Add Task Modal */}
      <AddTaskModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

      {/* Worker Assignment Modal */}
      <WorkerAssignmentModal 
        task={pendingDragTask}
        isOpen={isWorkerModalOpen}
        onClose={handleWorkerModalClose}
        onSuccess={handleWorkerAssignmentSuccess}
      />
    </div>
  )
}