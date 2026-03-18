import * as React from 'react'
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib'

const Collapsible = CollapsiblePrimitive.Root
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  className,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className={cn('rounded-lg border border-border bg-card/80 shadow-sm', className)}>
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-accent/60 rounded-lg data-[state=open]:bg-accent/50 data-[state=open]:border-b data-[state=open]:border-primary/20 data-[state=open]:rounded-t-lg data-[state=open]:rounded-b-none">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 group-data-[state=open]:text-primary" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-2 pb-2 pt-0.5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent, CollapsibleSection }
