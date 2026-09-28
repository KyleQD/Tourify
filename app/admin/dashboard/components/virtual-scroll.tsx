"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"

interface VirtualScrollProps<T> {
  items: T[]
  height: number
  itemHeight: number
  overscan?: number
  renderItem: (item: T, index: number) => React.ReactNode
  onScroll?: (scrollTop: number) => void
  className?: string
  containerClassName?: string
  emptyComponent?: React.ReactNode
}

export function VirtualScroll<T>({
  items,
  height,
  itemHeight,
  overscan = 5,
  renderItem,
  onScroll,
  className = "",
  containerClassName = "",
  emptyComponent
}: VirtualScrollProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  // Calculate virtual scroll state
  const virtualState = useMemo(() => {
    const totalHeight = items.length * itemHeight
    const startIndex = Math.max(0, Math.min(items.length - 1, Math.floor(scrollTop / itemHeight) - overscan))
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + height) / itemHeight) + overscan)

    return {
      totalHeight,
      startIndex,
      endIndex
    }
  }, [items.length, itemHeight, height, scrollTop, overscan])

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop
    setScrollTop(scrollTop)
    onScroll?.(scrollTop)
  }, [onScroll])

  // Scroll to specific item
  const scrollToItem = useCallback((index: number, behavior: 'auto' | 'smooth' = 'auto') => {
    if (containerRef.current) {
      const scrollTop = index * itemHeight
      containerRef.current.scrollTo({
        top: scrollTop,
        behavior
      })
    }
  }, [itemHeight])

  // Scroll to top
  const scrollToTop = useCallback((behavior: 'auto' | 'smooth' = 'smooth') => {
    scrollToItem(0, behavior)
  }, [scrollToItem])

  // Get visible items
  const visibleItems = items.slice(virtualState.startIndex, virtualState.endIndex)

  // Expose scroll methods
  useEffect(() => {
    if (containerRef.current) {
      ;(containerRef.current as any).scrollToItem = scrollToItem
      ;(containerRef.current as any).scrollToTop = scrollToTop
    }
  }, [scrollToItem, scrollToTop])

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        {emptyComponent || (
          <div className="text-center text-slate-400">
            <p>No items to display</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${containerClassName}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div
        className={`relative ${className}`}
        style={{ height: virtualState.totalHeight }}
      >
          {visibleItems.map((item, index) => {
            const actualIndex = virtualState.startIndex + index
            return (
              <div
                key={actualIndex}
                className="absolute left-0 right-0"
                style={{
                  // Use layout positioning so row offsets cannot be overwritten
                  // by transforms from an animation or a consuming component.
                  top: actualIndex * itemHeight,
                  height: itemHeight
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            )
          })}
      </div>
    </div>
  )
}

// Specialized virtual scroll components for common use cases
interface VirtualTableProps<T> {
  items: T[]
  height: number
  rowHeight: number
  columns: {
    key: string
    header: string
    width?: number | string
    render?: (item: T, index: number) => React.ReactNode
  }[]
  onRowClick?: (item: T, index: number) => void
  className?: string
  loading?: boolean
  emptyMessage?: string
}

export function VirtualTable<T>({
  items,
  height,
  rowHeight,
  columns,
  onRowClick,
  className = "",
  loading = false,
  emptyMessage = "No data available"
}: VirtualTableProps<T>) {
  const renderRow = useCallback((item: T, index: number) => {
    return (
      <div
        key={index}
        className={`flex items-center border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors cursor-pointer ${
          onRowClick ? 'cursor-pointer' : ''
        }`}
        style={{ height: rowHeight }}
        onClick={() => onRowClick?.(item, index)}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-4 py-2 flex-shrink-0"
            style={{ width: column.width }}
          >
            {column.render ? column.render(item, index) : (item as any)[column.key]}
          </div>
        ))}
      </div>
    )
  }, [columns, rowHeight, onRowClick])

  const renderHeader = useCallback(() => {
    return (
      <div className="flex items-center bg-slate-800/50 border-b border-slate-700 font-medium text-slate-300 sticky top-0 z-10">
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-4 py-3 flex-shrink-0"
            style={{ width: column.width }}
          >
            {column.header}
          </div>
        ))}
      </div>
    )
  }, [columns])

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center`} style={{ height }}>
        <div className="text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {renderHeader()}
      <VirtualScroll
        items={items}
        height={height - rowHeight} // Subtract header height
        itemHeight={rowHeight}
        renderItem={renderRow}
        emptyComponent={
          <div className="text-center text-slate-400 py-8">
            <p>{emptyMessage}</p>
          </div>
        }
      />
    </div>
  )
}

// Virtual list component for simple lists
interface VirtualListProps<T> {
  items: T[]
  height: number
  itemHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  loading?: boolean
  emptyMessage?: string
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className = "",
  loading = false,
  emptyMessage = "No items to display"
}: VirtualListProps<T>) {
  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center`} style={{ height }}>
        <div className="text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <VirtualScroll
      items={items}
      height={height}
      itemHeight={itemHeight}
      renderItem={renderItem}
      className={className}
      emptyComponent={
        <div className="text-center text-slate-400 py-8">
          <p>{emptyMessage}</p>
        </div>
      }
    />
  )
}
