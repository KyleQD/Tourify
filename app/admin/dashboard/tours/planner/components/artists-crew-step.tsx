"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Mic, 
  Wrench, 
  Plus, 
  Trash2, 
  Edit3,
  User,
  Calendar,
  CheckCircle
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface ArtistsCrewStepProps {
  tourData: {
    artists: Array<{
      id: string
      name: string
      role: string
      events: string[]
    }>
    crew: Array<{
      id: string
      name: string
      role: string
      events: string[]
    }>
    events: Array<{
      id: string
      name: string
      venue: string
      date: string
      time: string
      description: string
      capacity: number
    }>
  }
  updateTourData: (updates: any) => void
}

const artistRoles = [
  "Lead Vocalist", "Guitarist", "Bassist", "Drummer", "Keyboardist", 
  "Backup Singer", "Saxophonist", "Trumpeter", "Violinist", "DJ"
]

const crewRoles = [
  "Tour Manager", "Sound Engineer", "Lighting Technician", "Stage Manager",
  "Security", "Merchandise", "Photographer", "Videographer", "Driver",
  "Catering", "Medical", "Production Assistant"
]

export function ArtistsCrewStep({ tourData, updateTourData }: ArtistsCrewStepProps) {
  const [isAddingArtist, setIsAddingArtist] = useState(false)
  const [isAddingCrew, setIsAddingCrew] = useState(false)
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [newArtist, setNewArtist] = useState({
    name: "",
    role: "",
    events: [] as string[]
  })
  const [newCrew, setNewCrew] = useState({
    name: "",
    role: "",
    events: [] as string[]
  })

  const handleAddArtist = () => {
    if (newArtist.name && newArtist.role) {
      const artist = {
        id: Date.now().toString(),
        ...newArtist
      }
      updateTourData({
        artists: [...tourData.artists, artist]
      })
      setNewArtist({ name: "", role: "", events: [] })
      setIsAddingArtist(false)
    }
  }

  const handleAddCrew = () => {
    if (newCrew.name && newCrew.role) {
      const crew = {
        id: Date.now().toString(),
        ...newCrew
      }
      updateTourData({
        crew: [...tourData.crew, crew]
      })
      setNewCrew({ name: "", role: "", events: [] })
      setIsAddingCrew(false)
    }
  }

  const handleUpdateMember = (memberId: string, updates: any, type: 'artist' | 'crew') => {
    if (type === 'artist') {
      const updatedArtists = tourData.artists.map(artist =>
        artist.id === memberId ? { ...artist, ...updates } : artist
      )
      updateTourData({ artists: updatedArtists })
    } else {
      const updatedCrew = tourData.crew.map(crew =>
        crew.id === memberId ? { ...crew, ...updates } : crew
      )
      updateTourData({ crew: updatedCrew })
    }
    setEditingMember(null)
  }

  const handleRemoveMember = (memberId: string, type: 'artist' | 'crew') => {
    if (type === 'artist') {
      const updatedArtists = tourData.artists.filter(artist => artist.id !== memberId)
      updateTourData({ artists: updatedArtists })
    } else {
      const updatedCrew = tourData.crew.filter(crew => crew.id !== memberId)
      updateTourData({ crew: updatedCrew })
    }
  }

  const toggleEventAssignment = (memberId: string, eventId: string, type: 'artist' | 'crew') => {
    if (type === 'artist') {
      const updatedArtists = tourData.artists.map(artist => {
        if (artist.id === memberId) {
          const events = artist.events.includes(eventId)
            ? artist.events.filter(id => id !== eventId)
            : [...artist.events, eventId]
          return { ...artist, events }
        }
        return artist
      })
      updateTourData({ artists: updatedArtists })
    } else {
      const updatedCrew = tourData.crew.map(crew => {
        if (crew.id === memberId) {
          const events = crew.events.includes(eventId)
            ? crew.events.filter(id => id !== eventId)
            : [...crew.events, eventId]
          return { ...crew, events }
        }
        return crew
      })
      updateTourData({ crew: updatedCrew })
    }
  }

  return (
    <div className="space-y-8">
      {/* Artists Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mic className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Artists & Performers</h3>
          </div>
          <Button
            onClick={() => setIsAddingArtist(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Artist
          </Button>
        </div>

        {/* Add Artist Form */}
        {isAddingArtist && (
          <Card className="p-6 bg-slate-900/30 border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white text-sm">Artist Name *</Label>
                <Input
                  placeholder="Enter artist name..."
                  value={newArtist.name}
                  onChange={(e) => setNewArtist({ ...newArtist, name: e.target.value })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm">Role *</Label>
                <select
                  value={newArtist.role}
                  onChange={(e) => setNewArtist({ ...newArtist, role: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-600 text-white rounded-md px-3 py-2"
                >
                  <option value="">Select role...</option>
                  {artistRoles.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button
                onClick={handleAddArtist}
                disabled={!newArtist.name || !newArtist.role}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Add Artist
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddingArtist(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Artists List */}
        <div className="space-y-3">
          {tourData.artists.map((artist) => (
            <Card key={artist.id} className="p-4 bg-slate-900/30 border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <User className="w-4 h-4 text-purple-400" />
                    <h4 className="font-medium text-white">{artist.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {artist.role}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-400">
                    Assigned to {artist.events.length} event{artist.events.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingMember(artist.id)}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(artist.id, 'artist')}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Crew Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Crew & Staff</h3>
          </div>
          <Button
            onClick={() => setIsAddingCrew(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Crew
          </Button>
        </div>

        {/* Add Crew Form */}
        {isAddingCrew && (
          <Card className="p-6 bg-slate-900/30 border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white text-sm">Crew Name *</Label>
                <Input
                  placeholder="Enter crew name..."
                  value={newCrew.name}
                  onChange={(e) => setNewCrew({ ...newCrew, name: e.target.value })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm">Role *</Label>
                <select
                  value={newCrew.role}
                  onChange={(e) => setNewCrew({ ...newCrew, role: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-600 text-white rounded-md px-3 py-2"
                >
                  <option value="">Select role...</option>
                  {crewRoles.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button
                onClick={handleAddCrew}
                disabled={!newCrew.name || !newCrew.role}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add Crew
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddingCrew(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Crew List */}
        <div className="space-y-3">
          {tourData.crew.map((crew) => (
            <Card key={crew.id} className="p-4 bg-slate-900/30 border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <h4 className="font-medium text-white">{crew.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {crew.role}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-400">
                    Assigned to {crew.events.length} event{crew.events.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingMember(crew.id)}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(crew.id, 'crew')}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Event Assignment */}
      {tourData.events.length > 0 && (tourData.artists.length > 0 || tourData.crew.length > 0) && (
        <div className="space-y-4">
          <h4 className="text-white font-medium">Event Assignments</h4>
          <div className="space-y-3">
            {tourData.events.map((event) => (
              <Card key={event.id} className="p-4 bg-slate-900/30 border-slate-700">
                <div className="mb-3">
                  <h5 className="font-medium text-white">{event.name}</h5>
                  <p className="text-sm text-slate-400">
                    {formatSafeDate(event.date)} at {event.venue}
                  </p>
                </div>
                
                {/* Artists for this event */}
                {tourData.artists.length > 0 && (
                  <div className="mb-3">
                    <h6 className="text-sm font-medium text-purple-300 mb-2">Artists</h6>
                    <div className="flex flex-wrap gap-2">
                      {tourData.artists.map((artist) => (
                        <Badge
                          key={artist.id}
                          variant={artist.events.includes(event.id) ? "default" : "secondary"}
                          className={`cursor-pointer ${
                            artist.events.includes(event.id)
                              ? "bg-purple-600 text-white"
                              : "bg-slate-800 text-slate-300"
                          }`}
                          onClick={() => toggleEventAssignment(artist.id, event.id, 'artist')}
                        >
                          {artist.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Crew for this event */}
                {tourData.crew.length > 0 && (
                  <div>
                    <h6 className="text-sm font-medium text-blue-300 mb-2">Crew</h6>
                    <div className="flex flex-wrap gap-2">
                      {tourData.crew.map((crew) => (
                        <Badge
                          key={crew.id}
                          variant={crew.events.includes(event.id) ? "default" : "secondary"}
                          className={`cursor-pointer ${
                            crew.events.includes(event.id)
                              ? "bg-blue-600 text-white"
                              : "bg-slate-800 text-slate-300"
                          }`}
                          onClick={() => toggleEventAssignment(crew.id, event.id, 'crew')}
                        >
                          {crew.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {tourData.artists.length === 0 && tourData.crew.length === 0 && !isAddingArtist && !isAddingCrew && (
        <Card className="p-12 bg-slate-900/30 border-slate-700 border-dashed">
          <div className="text-center">
            <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Team Members Added</h3>
            <p className="text-slate-400 mb-4">
              Add artists and crew members to your tour team
            </p>
            <div className="flex justify-center space-x-2">
              <Button
                onClick={() => setIsAddingArtist(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Mic className="w-4 h-4 mr-2" />
                Add Artist
              </Button>
              <Button
                onClick={() => setIsAddingCrew(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Add Crew
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Validation Status */}
      <div className="flex items-center space-x-2 text-sm">
        {tourData.artists.length > 0 || tourData.crew.length > 0 ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400">
              {tourData.artists.length + tourData.crew.length} team member{(tourData.artists.length + tourData.crew.length) !== 1 ? 's' : ''} added
            </span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
            <span className="text-slate-400">Add at least one team member to continue</span>
          </>
        )}
      </div>
    </div>
  )
} 