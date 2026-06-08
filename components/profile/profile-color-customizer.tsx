"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { 
  Palette, 
  Sparkles, 
  Save, 
  RotateCcw, 
  Eye,
  Check,
  X,
  Zap,
  Moon,
  Sun,
  Rainbow
} from "lucide-react"
import { cn } from "@/lib/utils"

const colorCustomizationSchema = z.object({
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  background_gradient: z.enum(['emerald', 'blue', 'purple', 'rose', 'amber', 'cyan', 'indigo', 'custom']),
  custom_gradient_start: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional(),
  custom_gradient_end: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional(),
  use_dark_mode: z.boolean().default(false),
  enable_animations: z.boolean().default(true),
  enable_glow_effects: z.boolean().default(true),
})

type ColorCustomizationValues = z.infer<typeof colorCustomizationSchema>

interface ProfileColorCustomizerProps {
  profileId: string
  currentColors?: {
    primary_color?: string
    secondary_color?: string
    accent_color?: string
    background_gradient?: string
    custom_gradient_start?: string
    custom_gradient_end?: string
    use_dark_mode?: boolean
    enable_animations?: boolean
    enable_glow_effects?: boolean
  }
  onColorsChange?: (colors: ColorCustomizationValues) => void
  onPreview?: (colors: ColorCustomizationValues) => void
}

// Predefined color themes
const predefinedThemes = {
  emerald: {
    name: "Emerald",
    primary_color: "#10b981",
    secondary_color: "#059669",
    accent_color: "#34d399",
    background_gradient: "emerald" as const,
    description: "Fresh and professional green theme"
  },
  blue: {
    name: "Ocean",
    primary_color: "#3b82f6",
    secondary_color: "#1d4ed8",
    accent_color: "#60a5fa",
    background_gradient: "blue" as const,
    description: "Calm and trustworthy blue theme"
  },
  purple: {
    name: "Royal",
    primary_color: "#8b5cf6",
    secondary_color: "#7c3aed",
    accent_color: "#a78bfa",
    background_gradient: "purple" as const,
    description: "Creative and luxurious purple theme"
  },
  rose: {
    name: "Sunset",
    primary_color: "#f43f5e",
    secondary_color: "#e11d48",
    accent_color: "#fb7185",
    background_gradient: "rose" as const,
    description: "Warm and energetic rose theme"
  },
  amber: {
    name: "Golden",
    primary_color: "#f59e0b",
    secondary_color: "#d97706",
    accent_color: "#fbbf24",
    background_gradient: "amber" as const,
    description: "Bright and optimistic amber theme"
  },
  cyan: {
    name: "Aqua",
    primary_color: "#06b6d4",
    secondary_color: "#0891b2",
    accent_color: "#22d3ee",
    background_gradient: "cyan" as const,
    description: "Modern and tech-savvy cyan theme"
  },
  indigo: {
    name: "Midnight",
    primary_color: "#6366f1",
    secondary_color: "#4f46e5",
    accent_color: "#818cf8",
    background_gradient: "indigo" as const,
    description: "Deep and sophisticated indigo theme"
  }
}

// Background gradient options
const gradientOptions = [
  { value: 'emerald', label: 'Emerald', gradient: 'from-emerald-900 via-emerald-900/20 to-slate-900' },
  { value: 'blue', label: 'Ocean', gradient: 'from-blue-900 via-blue-900/20 to-slate-900' },
  { value: 'purple', label: 'Royal', gradient: 'from-purple-900 via-purple-900/20 to-slate-900' },
  { value: 'rose', label: 'Sunset', gradient: 'from-rose-900 via-rose-900/20 to-slate-900' },
  { value: 'amber', label: 'Golden', gradient: 'from-amber-900 via-amber-900/20 to-slate-900' },
  { value: 'cyan', label: 'Aqua', gradient: 'from-cyan-900 via-cyan-900/20 to-slate-900' },
  { value: 'indigo', label: 'Midnight', gradient: 'from-indigo-900 via-indigo-900/20 to-slate-900' },
  { value: 'custom', label: 'Custom', gradient: 'from-slate-900 via-slate-900/20 to-slate-900' }
]

export function ProfileColorCustomizer({ 
  profileId, 
  currentColors, 
  onColorsChange, 
  onPreview 
}: ProfileColorCustomizerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  const form = useForm<ColorCustomizationValues>({
    resolver: zodResolver(colorCustomizationSchema),
    defaultValues: {
      primary_color: currentColors?.primary_color || "#10b981",
      secondary_color: currentColors?.secondary_color || "#059669",
      accent_color: currentColors?.accent_color || "#34d399",
      background_gradient: (currentColors?.background_gradient as any) || "emerald",
      custom_gradient_start: currentColors?.custom_gradient_start || "#0f172a",
      custom_gradient_end: currentColors?.custom_gradient_end || "#1e293b",
      use_dark_mode: currentColors?.use_dark_mode || false,
      enable_animations: currentColors?.enable_animations ?? true,
      enable_glow_effects: currentColors?.enable_glow_effects ?? true,
    }
  })

  const { watch, setValue, reset } = form
  const watchedValues = watch()

  // Apply theme
  const applyTheme = (themeKey: string) => {
    const theme = predefinedThemes[themeKey as keyof typeof predefinedThemes]
    if (theme) {
      setValue("primary_color", theme.primary_color)
      setValue("secondary_color", theme.secondary_color)
      setValue("accent_color", theme.accent_color)
      setValue("background_gradient", theme.background_gradient)
      setSelectedTheme(themeKey)
      
      // Trigger preview update
      const newValues = {
        ...watchedValues,
        primary_color: theme.primary_color,
        secondary_color: theme.secondary_color,
        accent_color: theme.accent_color,
        background_gradient: theme.background_gradient,
      }
      onPreview?.(newValues)
    }
  }

  // Reset to default
  const resetToDefault = () => {
    reset({
      primary_color: "#10b981",
      secondary_color: "#059669",
      accent_color: "#34d399",
      background_gradient: "emerald",
      custom_gradient_start: "#0f172a",
      custom_gradient_end: "#1e293b",
      use_dark_mode: false,
      enable_animations: true,
      enable_glow_effects: true,
    })
    setSelectedTheme(null)
    
    const defaultValues = {
      primary_color: "#10b981",
      secondary_color: "#059669",
      accent_color: "#34d399",
      background_gradient: "emerald" as const,
      custom_gradient_start: "#0f172a",
      custom_gradient_end: "#1e293b",
      use_dark_mode: false,
      enable_animations: true,
      enable_glow_effects: true,
    }
    onPreview?.(defaultValues)
  }

  // Save colors
  const onSubmit = async (data: ColorCustomizationValues) => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ color_scheme: data }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to save colors')
      }

      onColorsChange?.(data)

      toast({
        title: "Colors Updated",
        description: "Your profile colors have been saved successfully!",
      })
    } catch (error) {
      console.error('Error saving colors:', error)
      toast({
        title: "Error",
        description: "Failed to save color customization. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Watch for changes and update preview
  useEffect(() => {
    if (previewMode) {
      onPreview?.(watchedValues)
    }
  }, [watchedValues, previewMode, onPreview])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Profile Colors</h2>
          <p className="text-white/70">Customize your profile's visual appearance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
            className={cn(
              "border-white/30 text-white hover:bg-white/10",
              previewMode && "bg-white/10"
            )}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? "Hide Preview" : "Show Preview"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            className="border-white/30 text-white hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Predefined Themes */}
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                Quick Themes
              </CardTitle>
              <CardDescription className="text-white/70">
                Choose from our curated color themes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(predefinedThemes).map(([key, theme]) => (
                  <div
                    key={key}
                    className={cn(
                      "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                      selectedTheme === key 
                        ? "border-emerald-400 bg-emerald-500/10" 
                        : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
                    )}
                    onClick={() => applyTheme(key)}
                  >
                    {selectedTheme === key && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-4 w-4 text-emerald-400" />
                      </div>
                    )}
                    
                    {/* Color preview */}
                    <div className="flex gap-1 mb-3">
                      <div 
                        className="w-6 h-6 rounded-full" 
                        style={{ backgroundColor: theme.primary_color }}
                      />
                      <div 
                        className="w-6 h-6 rounded-full" 
                        style={{ backgroundColor: theme.secondary_color }}
                      />
                      <div 
                        className="w-6 h-6 rounded-full" 
                        style={{ backgroundColor: theme.accent_color }}
                      />
                    </div>
                    
                    <h4 className="text-white font-medium text-sm">{theme.name}</h4>
                    <p className="text-white/60 text-xs mt-1">{theme.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom Colors */}
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Palette className="h-5 w-5 text-emerald-400" />
                Custom Colors
              </CardTitle>
              <CardDescription className="text-white/70">
                Fine-tune your color palette
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="primary_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Primary Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <Input
                            {...field}
                            type="color"
                            className="w-16 h-12 p-1 rounded-lg border-white/20 bg-white/10"
                          />
                          <Input
                            {...field}
                            placeholder="#10b981"
                            className="flex-1 bg-white/10 border-white/20 text-white"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secondary_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Secondary Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <Input
                            {...field}
                            type="color"
                            className="w-16 h-12 p-1 rounded-lg border-white/20 bg-white/10"
                          />
                          <Input
                            {...field}
                            placeholder="#059669"
                            className="flex-1 bg-white/10 border-white/20 text-white"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accent_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Accent Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <Input
                            {...field}
                            type="color"
                            className="w-16 h-12 p-1 rounded-lg border-white/20 bg-white/10"
                          />
                          <Input
                            {...field}
                            placeholder="#34d399"
                            className="flex-1 bg-white/10 border-white/20 text-white"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Background Gradient */}
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Rainbow className="h-5 w-5 text-emerald-400" />
                Background Gradient
              </CardTitle>
              <CardDescription className="text-white/70">
                Choose your profile background style
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gradientOptions.map((option) => (
                    <div
                      key={option.value}
                      className={cn(
                        "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                        watchedValues.background_gradient === option.value
                          ? "border-emerald-400 bg-emerald-500/10"
                          : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
                      )}
                      onClick={() => setValue("background_gradient", option.value as any)}
                    >
                      {watchedValues.background_gradient === option.value && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-4 w-4 text-emerald-400" />
                        </div>
                      )}
                      
                      <div className={cn(
                        "w-full h-16 rounded-lg mb-3 bg-gradient-to-br",
                        option.gradient
                      )} />
                      
                      <h4 className="text-white font-medium text-sm text-center">{option.label}</h4>
                    </div>
                  ))}
                </div>

                {watchedValues.background_gradient === 'custom' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/20">
                    <FormField
                      control={form.control}
                      name="custom_gradient_start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Gradient Start</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-3">
                              <Input
                                {...field}
                                type="color"
                                className="w-16 h-12 p-1 rounded-lg border-white/20 bg-white/10"
                              />
                              <Input
                                {...field}
                                placeholder="#0f172a"
                                className="flex-1 bg-white/10 border-white/20 text-white"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="custom_gradient_end"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Gradient End</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-3">
                              <Input
                                {...field}
                                type="color"
                                className="w-16 h-12 p-1 rounded-lg border-white/20 bg-white/10"
                              />
                              <Input
                                {...field}
                                placeholder="#1e293b"
                                className="flex-1 bg-white/10 border-white/20 text-white"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Effects & Options */}
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-400" />
                Effects & Options
              </CardTitle>
              <CardDescription className="text-white/70">
                Customize additional visual effects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="use_dark_mode"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div className="space-y-0.5">
                        <FormLabel className="text-white">Dark Mode</FormLabel>
                        <FormDescription className="text-white/60">
                          Use darker color scheme for better contrast
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enable_animations"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div className="space-y-0.5">
                        <FormLabel className="text-white">Animations</FormLabel>
                        <FormDescription className="text-white/60">
                          Enable smooth transitions and hover effects
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enable_glow_effects"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div className="space-y-0.5">
                        <FormLabel className="text-white">Glow Effects</FormLabel>
                        <FormDescription className="text-white/60">
                          Add subtle glow effects to interactive elements
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Colors
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
} 