"use client"

import * as React from "react"
import { clsx } from "clsx"

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function ScrollArea({ children, className, ...props }: ScrollAreaProps) {
  return (
    <div
      className={clsx("overflow-auto", className)}
      style={{ maxHeight: '400px' }}
      {...props}
    >
      {children}
    </div>
  )
}
