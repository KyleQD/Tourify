import type { ImgHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface TourifyLogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  variant?: 'light' | 'dark' | 'white'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl'
}

export function TourifyLogo({ 
  variant = 'light', 
  size = 'md', 
  className,
  ...props 
}: TourifyLogoProps) {
  const sizeClasses = {
    xs: 'h-4 w-auto',
    sm: 'h-6 w-auto',
    md: 'h-8 w-auto',
    lg: 'h-10 w-auto',
    xl: 'h-12 w-auto',
    '2xl': 'h-24 w-auto',
    '3xl': 'h-32 w-auto',
    '4xl': 'h-48 w-auto',
    '5xl': 'h-56 w-auto',
    '6xl': 'h-64 w-auto'
  }

  // Determine which logo file to use based on variant
  const logoSrc = variant === 'white' || variant === 'dark' 
    ? "/tourify-logo-white.png"
    : "/tourify-logo.png"
  
  return (
    <img
      src={logoSrc}
      alt="Tourify"
      className={cn(sizeClasses[size], "object-contain", className)}
      {...props}
    />
  )
}
