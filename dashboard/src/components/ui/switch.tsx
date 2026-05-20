"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border border-gv-border transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-gv-bg",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-blue-600/60 data-[state=checked]:bg-blue-600",
        "data-[state=unchecked]:border-gv-border data-[state=unchecked]:bg-[#2a3548]",
        size === "default" && "h-6 w-11",
        size === "sm" && "h-5 w-9",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-md ring-0 transition-transform",
          size === "default" && "size-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
          size === "sm" && "size-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
