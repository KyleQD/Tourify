"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Search, Filter, X } from "lucide-react"
import { useSocial } from "@/contexts/social-context"
import { useDebounce } from "@/hooks/use-debounce"
import type { User } from "@/types/user"
// Mock functions for search service
const getAllSkills = () => ['JavaScript', 'React', 'TypeScript', 'Node.js']
const getAllLocations = () => ['New York', 'Los Angeles', 'Chicago', 'Miami']
const getAllTitles = () => ['Software Engineer', 'Designer', 'Manager', 'Developer']

interface AdvancedSearchProps {
  onResultsChange?: (results: User[]) => void
}

export function AdvancedSearch({ onResultsChange }: AdvancedSearchProps) {
  // Mock searchUsers function
  const searchUsers = async (query: string, filters?: any) => {
    // Mock implementation
    return []
  }

  // Basic search
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false)
  const [location, setLocation] = useState("")
  const [title, setTitle] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [experienceRange, setExperienceRange] = useState([0, 20])
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [sortBy, setSortBy] = useState("relevance")

  // Results
  const [results, setResults] = useState<User[]>([])

  // Available data
  const availableSkills = getAllSkills()
  const availableLocations = getAllLocations()
  const availableTitles = getAllTitles()

  // Search function
  useEffect(() => {
    const performSearch = async () => {
    // Apply search with filters
    const filters = showFilters
      ? {
          location: location !== "any" ? location : undefined,
          title: title !== "any" ? title : undefined,
          skills: skills.length > 0 ? skills : undefined,
          experienceRange: experienceRange,
          onlineOnly: onlineOnly,
          sortBy: sortBy as "relevance" | "name" | "recent",
        }
      : {}

    const filteredUsers = await searchUsers(debouncedSearchQuery, filters)
    setResults(filteredUsers)

    if (onResultsChange) {
      onResultsChange(filteredUsers)
    }
    }
    
    performSearch()
  }, [
    debouncedSearchQuery,
    searchQuery,
    showFilters,
    location,
    title,
    skills,
    experienceRange,
    onlineOnly,
    sortBy,
    onResultsChange,
  ])

  const handleResetFilters = () => {
    setLocation("")
    setTitle("")
    setSkills([])
    setExperienceRange([0, 20])
    setOnlineOnly(false)
    setSortBy("relevance")
  }

  const toggleSkill = (skill: string) => {
    if (skills.includes(skill)) {
      setSkills(skills.filter((s) => s !== skill))
    } else {
      setSkills([...skills, skill])
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
        <Input
          placeholder="Search by name, username, title, or location"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-gray-800 border-gray-700 text-white pr-10"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-gray-500"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-4 border border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Advanced Filters</h3>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleResetFilters}>
              <X className="h-3 w-3 mr-1" /> Reset
            </Button>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="location" className="border-gray-700">
              <AccordionTrigger className="text-sm py-2">Location</AccordionTrigger>
              <AccordionContent>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    <SelectItem value="any">Any location</SelectItem>
                    {availableLocations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="title" className="border-gray-700">
              <AccordionTrigger className="text-sm py-2">Professional Title</AccordionTrigger>
              <AccordionContent>
                <Select value={title} onValueChange={setTitle}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                    <SelectValue placeholder="Select title" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    <SelectItem value="any">Any title</SelectItem>
                    {availableTitles.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="skills" className="border-gray-700">
              <AccordionTrigger className="text-sm py-2">Skills</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2">
                  {availableSkills.map((skill) => (
                    <div key={skill} className="flex items-center space-x-2">
                      <Checkbox
                        id={`skill-${skill}`}
                        checked={skills.includes(skill)}
                        onCheckedChange={() => toggleSkill(skill)}
                      />
                      <Label htmlFor={`skill-${skill}`} className="text-sm">
                        {skill}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="experience" className="border-gray-700">
              <AccordionTrigger className="text-sm py-2">Years of Experience</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <Slider value={experienceRange} min={0} max={20} step={1} onValueChange={setExperienceRange} />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{experienceRange[0]} years</span>
                    <span>{experienceRange[1]} years</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="online-only"
              checked={onlineOnly}
              onCheckedChange={(checked) => setOnlineOnly(checked as boolean)}
            />
            <Label htmlFor="online-only">Online users only</Label>
          </div>

          <div className="pt-2">
            <Label htmlFor="sort-by" className="block mb-2">
              Sort by
            </Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sort-by" className="bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="recent">Recently Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex justify-between text-sm text-gray-500">
        <span>{results.length} results found</span>
        {showFilters && (
          <Button variant="link" className="p-0 h-auto text-purple-400" onClick={() => setShowFilters(false)}>
            Hide filters
          </Button>
        )}
      </div>
    </div>
  )
}
