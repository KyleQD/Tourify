"use client"

import { useState, useCallback } from "react"
import type { ProfileData } from "@/lib/venue/types"
import { ConfirmDialog } from "./confirm-dialog"
import { GalleryItem } from "./gallery-item"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

interface OptimizedDragDropGalleryProps {
  items: ProfileData["gallery"]
  onRemove: (id: string) => void
  onReorder: (newOrder: ProfileData["gallery"]) => void
}

export function OptimizedDragDropGallery({ items, onRemove, onReorder }: OptimizedDragDropGalleryProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [itemToRemove, setItemToRemove] = useState<string | null>(null)

  const handleRemoveClick = useCallback((id: string) => {
    setItemToRemove(id)
    setShowConfirm(true)
  }, [])

  const confirmRemove = useCallback(() => {
    if (itemToRemove) {
      onRemove(itemToRemove)
    }
  }, [itemToRemove, onRemove])

  const handleDragEnd = useCallback(
    (result: any) => {
      if (!result.destination) return

      const reorderedItems = Array.from(items)
      const [removed] = reorderedItems.splice(result.source.index, 1)
      reorderedItems.splice(result.destination.index, 0, removed)

      onReorder(reorderedItems)
    },
    [items, onReorder],
  )

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="gallery" direction="horizontal">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-3 gap-2">
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.draggableProps}>
                      <GalleryItem
                        id={item.id}
                        url={item.url}
                        alt={item.alt}
                        onRemove={handleRemoveClick}
                        isDragging={snapshot.isDragging}
                        dragHandleProps={provided.dragHandleProps}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmRemove}
        title="Remove Media"
        description="Are you sure you want to remove this media from your gallery? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  )
}
