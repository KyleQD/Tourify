"use client"

import { useState, useEffect } from 'react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { SurfaceCard, SurfaceInput } from '@/components/surface/surface-primitives'
import { 
  Search, 
  Filter, 
  X, 
  MapPin, 
  Calendar, 
  DollarSign,
  Clock,
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
      page: 1 // Reset to first page when filters change
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
    <SurfaceCard className="border-gray-800/50 bg-gray-900/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="rounded-xl text-gray-400"
            >
              {showAdvanced ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  More
                </>
              )}
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="rounded-xl text-gray-400 hover:text-red-400"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
          <SurfaceInput
            placeholder="Search jobs..."
            value={filters.query || ''}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Category</Label>
            <Select
              value={filters.category_id || 'all'}
              onValueChange={(value) => handleFilterChange('category_id', value === 'all' ? undefined : value)}
            >
              <SelectTrigger className="surface-entry">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Sort by</Label>
            <Select
              value={filters.sort_by || 'created_at'}
              onValueChange={(value) => handleFilterChange('sort_by', value as any)}
            >
              <SelectTrigger className="surface-entry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value || 'created_at'}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Payment Type */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Payment Type</Label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_TYPE_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`payment-${option.value}`}
                  checked={filters.payment_type?.includes(option.value) || false}
                  onCheckedChange={(checked) => 
                    handleArrayFilterChange('payment_type', option.value, checked as boolean)
                  }
                />
                <Label htmlFor={`payment-${option.value}`} className="text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-6 pt-4 border-t border-gray-800">
            {/* Job Type */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Job Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {JOB_TYPE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`job-type-${option.value}`}
                      checked={filters.job_type?.includes(option.value) || false}
                      onCheckedChange={(checked) => 
                        handleArrayFilterChange('job_type', option.value, checked as boolean)
                      }
                    />
                    <Label htmlFor={`job-type-${option.value}`} className="text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Location Type */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Location Type</Label>
              <div className="flex flex-wrap gap-2">
                {LOCATION_TYPE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`location-${option.value}`}
                      checked={filters.location_type?.includes(option.value!) || false}
                      onCheckedChange={(checked) => 
                        handleArrayFilterChange('location_type', option.value!, checked as boolean)
                      }
                    />
                    <Label htmlFor={`location-${option.value}`} className="text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Experience Level</Label>
              <div className="grid grid-cols-2 gap-2">
                {EXPERIENCE_LEVEL_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`experience-${option.value}`}
                      checked={filters.required_experience?.includes(option.value!) || false}
                      onCheckedChange={(checked) => 
                        handleArrayFilterChange('required_experience', option.value!, checked as boolean)
                      }
                    />
                    <Label htmlFor={`experience-${option.value}`} className="text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Range */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Payment Range: ${paymentRange[0]} - ${paymentRange[1]}
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

            {/* Location */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">City</Label>
                <SurfaceInput
                  placeholder="Enter city"
                  value={filters.city || ''}
                  onChange={(e) => handleFilterChange('city', e.target.value || undefined)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">State</Label>
                <SurfaceInput
                  placeholder="Enter state"
                  value={filters.state || ''}
                  onChange={(e) => handleFilterChange('state', e.target.value || undefined)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Country</Label>
                <SurfaceInput
                  placeholder="Enter country"
                  value={filters.country || ''}
                  onChange={(e) => handleFilterChange('country', e.target.value || undefined)}
                />
              </div>
            </div>

            {/* Featured Only */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured-only"
                checked={filters.featured_only || false}
                onCheckedChange={(checked) => 
                  handleFilterChange('featured_only', checked ? true : undefined)
                }
              />
              <Label htmlFor="featured-only" className="text-sm flex items-center gap-1">
                <Star className="w-4 h-4" />
                Featured jobs only
              </Label>
            </div>
          </div>
        )}
      </CardContent>
    </SurfaceCard>
  )
} 