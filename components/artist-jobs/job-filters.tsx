"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { SurfaceCard, SurfaceInput } from '@/components/surface/surface-primitives'
import { 
  Search, 
  Filter, 
  X, 
  Star,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { JobFiltersProps, JobSearchFilters } from '@/types/artist-jobs'
import { 
  PAYMENT_TYPE_OPTIONS, 
  JOB_TYPE_OPTIONS, 
  LOCATION_TYPE_OPTIONS, 
  EXPERIENCE_LEVEL_OPTIONS,
  JOB_SORT_OPTIONS
} from '@/types/artist-jobs'

function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20'
          : 'border border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

export function JobFilters({ 
  filters, 
  onFiltersChange, 
  categories, 
  isLoading = false 
}: JobFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [paymentRange, setPaymentRange] = useState([
    filters.min_payment || 0,
    filters.max_payment || 10000
  ])

  const handleFilterChange = (key: keyof JobSearchFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
      page: 1
    })
  }

  const handleArrayFilterChange = (key: keyof JobSearchFilters, value: string, checked: boolean) => {
    const currentArray = (filters[key] as string[]) || []
    const newArray = checked 
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value)
    
    handleFilterChange(key, newArray.length > 0 ? newArray : undefined)
  }

  const handlePaymentRangeChange = (values: number[]) => {
    setPaymentRange(values)
  }

  const handlePaymentRangeCommit = (values: number[]) => {
    onFiltersChange({
      ...filters,
      min_payment: values[0] > 0 ? values[0] : undefined,
      max_payment: values[1] < 10000 ? values[1] : undefined,
      page: 1
    })
  }

  const clearFilters = () => {
    onFiltersChange({
      query: '',
      sort_by: 'created_at',
      sort_order: 'desc',
      page: 1,
      per_page: 20
    })
    setPaymentRange([0, 10000])
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.query) count++
    if (filters.category_id) count++
    if (filters.payment_type?.length) count++
    if (filters.job_type?.length) count++
    if (filters.location_type?.length) count++
    if (filters.required_experience?.length) count++
    if (filters.required_genres?.length) count++
    if (filters.required_skills?.length) count++
    if (filters.min_payment !== undefined) count++
    if (filters.max_payment !== undefined) count++
    if (filters.city) count++
    if (filters.state) count++
    if (filters.country) count++
    if (filters.featured_only) count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <SurfaceCard className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/50 to-transparent" />

      <div className="space-y-5 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500/20 via-purple-500/20 to-cyan-400/20 ring-1 ring-white/10">
              <Filter className="h-4 w-4 text-fuchsia-200" />
            </div>
            <h3 className="text-base font-semibold text-white">Filters</h3>
            {activeFiltersCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-fuchsia-500/30 bg-fuchsia-500/20 px-1.5 text-[11px] font-medium text-fuchsia-100">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-8 rounded-lg px-2 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              {showAdvanced ? (
                <>
                  <ChevronUp className="mr-1 h-3.5 w-3.5" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3.5 w-3.5" />
                  More
                </>
              )}
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 rounded-lg px-2 text-slate-400 hover:bg-white/10 hover:text-red-300"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <SurfaceInput
            placeholder="Search jobs..."
            value={filters.query || ''}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            disabled={isLoading}
            className="h-11 rounded-2xl pl-11 focus-visible:border-fuchsia-500/50 focus-visible:ring-fuchsia-500/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Category
            </Label>
            <Select
              value={filters.category_id || 'all'}
              onValueChange={(value) => handleFilterChange('category_id', value === 'all' ? undefined : value)}
            >
              <SelectTrigger className="surface-entry h-10">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-900/95 text-slate-100 backdrop-blur-xl">
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Sort by
            </Label>
            <Select
              value={filters.sort_by || 'created_at'}
              onValueChange={(value) => handleFilterChange('sort_by', value as any)}
            >
              <SelectTrigger className="surface-entry h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-900/95 text-slate-100 backdrop-blur-xl">
                {JOB_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value || 'created_at'}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Payment Type
          </Label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_TYPE_OPTIONS.map((option) => {
              const isActive = filters.payment_type?.includes(option.value) || false
              return (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  isActive={isActive}
                  onClick={() => handleArrayFilterChange('payment_type', option.value, !isActive)}
                />
              )
            })}
          </div>
        </div>

        {showAdvanced && (
          <div className="space-y-5 border-t border-white/10 pt-5">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Job Type
              </Label>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPE_OPTIONS.map((option) => {
                  const isActive = filters.job_type?.includes(option.value) || false
                  return (
                    <FilterChip
                      key={option.value}
                      label={option.label}
                      isActive={isActive}
                      onClick={() => handleArrayFilterChange('job_type', option.value, !isActive)}
                    />
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Location Type
              </Label>
              <div className="flex flex-wrap gap-2">
                {LOCATION_TYPE_OPTIONS.map((option) => {
                  const isActive = filters.location_type?.includes(option.value!) || false
                  return (
                    <FilterChip
                      key={option.value}
                      label={option.label}
                      isActive={isActive}
                      onClick={() => handleArrayFilterChange('location_type', option.value!, !isActive)}
                    />
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Experience Level
              </Label>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_LEVEL_OPTIONS.map((option) => {
                  const isActive = filters.required_experience?.includes(option.value!) || false
                  return (
                    <FilterChip
                      key={option.value}
                      label={option.label}
                      isActive={isActive}
                      onClick={() => handleArrayFilterChange('required_experience', option.value!, !isActive)}
                    />
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Payment Range: ${paymentRange[0].toLocaleString()} – ${paymentRange[1].toLocaleString()}
              </Label>
              <Slider
                value={paymentRange}
                onValueChange={handlePaymentRangeChange}
                onValueCommit={handlePaymentRangeCommit}
                max={10000}
                min={0}
                step={50}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-400">City</Label>
                <SurfaceInput
                  placeholder="City"
                  value={filters.city || ''}
                  onChange={(e) => handleFilterChange('city', e.target.value || undefined)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-400">State</Label>
                <SurfaceInput
                  placeholder="State"
                  value={filters.state || ''}
                  onChange={(e) => handleFilterChange('state', e.target.value || undefined)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-400">Country</Label>
                <SurfaceInput
                  placeholder="Country"
                  value={filters.country || ''}
                  onChange={(e) => handleFilterChange('country', e.target.value || undefined)}
                  className="h-9"
                />
              </div>
            </div>

            <div>
              <FilterChip
                label="Featured only"
                isActive={!!filters.featured_only}
                onClick={() => handleFilterChange('featured_only', filters.featured_only ? undefined : true)}
              />
              {filters.featured_only && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-fuchsia-300">
                  <Star className="h-3 w-3" />
                  Showing featured
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </SurfaceCard>
  )
}
