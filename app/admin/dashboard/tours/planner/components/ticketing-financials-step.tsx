"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  Ticket, 
  DollarSign, 
  Plus, 
  Trash2, 
  Edit3,
  CreditCard,
  BarChart3,
  Users,
  CheckCircle,
  ExternalLink,
  Calendar,
  MapPin,
  Settings
} from "lucide-react"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface TicketingFinancialsStepProps {
  tourData: {
    events: Array<{
      id: string
      name: string
      venue: string
      date: string
      time: string
      description: string
      capacity: number
    }>
    ticketTypes: Array<{
      id: string
      name: string
      price: number
      quantity: number
      description: string
      event_id?: string
      is_third_party?: boolean
      third_party_url?: string
      third_party_fee?: number
      sale_start?: string
      sale_end?: string
      max_per_customer?: number
      benefits?: string[]
    }>
    budget: {
      total: number
      expenses: Array<{
        category: string
        amount: number
        description: string
      }>
    }
    sponsors: Array<{
      name: string
      contribution: number
      type: string
    }>
  }
  updateTourData: (updates: any) => void
}

const expenseCategories = [
  "Venue Rental", "Artist Fees", "Marketing", "Insurance", "Permits", 
  "Security", "Catering", "Merchandise", "Travel", "Equipment Rental"
]

const sponsorTypes = [
  "Title Sponsor", "Platinum Sponsor", "Gold Sponsor", "Silver Sponsor", 
  "Bronze Sponsor", "Media Partner", "Venue Partner", "Equipment Partner"
]

const commonTicketTypes = [
  "General Admission", "VIP", "Early Bird", "Student", "Senior", "Group", "Backstage Pass"
]

export function TicketingFinancialsStep({ tourData, updateTourData }: TicketingFinancialsStepProps) {
  const [isAddingTicket, setIsAddingTicket] = useState(false)
  const [isAddingExpense, setIsAddingExpense] = useState(false)
  const [isAddingSponsor, setIsAddingSponsor] = useState(false)
  const [newTicket, setNewTicket] = useState({
    name: "",
    price: 0,
    quantity: 0,
    description: "",
    event_id: "",
    is_third_party: false,
    third_party_url: "",
    third_party_fee: 0,
    sale_start: "",
    sale_end: "",
    max_per_customer: 4,
    benefits: [] as string[]
  })
  const [newExpense, setNewExpense] = useState({
    category: "",
    amount: 0,
    description: ""
  })
  const [newSponsor, setNewSponsor] = useState({
    name: "",
    contribution: 0,
    type: ""
  })
  const [newBenefit, setNewBenefit] = useState("")

  const handleAddTicket = () => {
    if (newTicket.name && newTicket.price > 0) {
      const ticket = {
        id: Date.now().toString(),
        ...newTicket
      }
      updateTourData({
        ticketTypes: [...tourData.ticketTypes, ticket]
      })
      setNewTicket({ 
        name: "", 
        price: 0, 
        quantity: 0, 
        description: "", 
        event_id: "", 
        is_third_party: false, 
        third_party_url: "", 
        third_party_fee: 0, 
        sale_start: "", 
        sale_end: "", 
        max_per_customer: 4, 
        benefits: [] 
      })
      setIsAddingTicket(false)
    }
  }

  const handleAddExpense = () => {
    if (newExpense.category && newExpense.amount > 0) {
      updateTourData({
        budget: {
          ...tourData.budget,
          expenses: [...tourData.budget.expenses, newExpense]
        }
      })
      setNewExpense({ category: "", amount: 0, description: "" })
      setIsAddingExpense(false)
    }
  }

  const handleAddSponsor = () => {
    if (newSponsor.name && newSponsor.contribution > 0) {
      updateTourData({
        sponsors: [...tourData.sponsors, newSponsor]
      })
      setNewSponsor({ name: "", contribution: 0, type: "" })
      setIsAddingSponsor(false)
    }
  }

  const handleRemoveTicket = (index: number) => {
    const updatedTickets = tourData.ticketTypes.filter((_, i) => i !== index)
    updateTourData({ ticketTypes: updatedTickets })
  }

  const handleRemoveExpense = (index: number) => {
    const updatedExpenses = tourData.budget.expenses.filter((_, i) => i !== index)
    updateTourData({
      budget: { ...tourData.budget, expenses: updatedExpenses }
    })
  }

  const handleRemoveSponsor = (index: number) => {
    const updatedSponsors = tourData.sponsors.filter((_, i) => i !== index)
    updateTourData({ sponsors: updatedSponsors })
  }

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setNewTicket({
        ...newTicket,
        benefits: [...newTicket.benefits, newBenefit.trim()]
      })
      setNewBenefit("")
    }
  }

  const removeBenefit = (index: number) => {
    setNewTicket({
      ...newTicket,
      benefits: newTicket.benefits.filter((_, i) => i !== index)
    })
  }

  const totalTicketRevenue = tourData.ticketTypes.reduce((sum, ticket) => 
    sum + (ticket.price * ticket.quantity), 0
  )

  const totalExpenses = tourData.budget.expenses.reduce((sum, expense) => 
    sum + expense.amount, 0
  )

  const totalSponsorContributions = tourData.sponsors.reduce((sum, sponsor) => 
    sum + sponsor.contribution, 0
  )

  const netProfit = totalTicketRevenue + totalSponsorContributions - totalExpenses

  // Group tickets by event
  const ticketsByEvent = tourData.ticketTypes.reduce((acc, ticket) => {
    const eventId = ticket.event_id || 'general'
    if (!acc[eventId]) {
      acc[eventId] = []
    }
    acc[eventId].push(ticket)
    return acc
  }, {} as Record<string, typeof tourData.ticketTypes>)

  const getEventName = (eventId: string) => {
    if (eventId === 'general') return 'All Events'
    const event = tourData.events.find(e => e.id === eventId)
    return event ? event.name : 'Unknown Event'
  }

  return (
    <div className="space-y-8">
      {/* Ticket Types */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Ticket className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Ticket Types & Pricing</h3>
          </div>
          <Button
            onClick={() => setIsAddingTicket(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Ticket Type
          </Button>
        </div>

        {/* Add Ticket Form */}
        {isAddingTicket && (
          <Card className="p-6 bg-slate-900/30 border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white text-sm">Ticket Name *</Label>
                <Input
                  placeholder="e.g., VIP, General Admission..."
                  value={newTicket.name}
                  onChange={(e) => setNewTicket({ ...newTicket, name: e.target.value })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm">Price ($) *</Label>
                <Input
                  type="number"
                  placeholder="Enter price..."
                  value={newTicket.price || ''}
                  onChange={(e) => setNewTicket({ ...newTicket, price: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm">Event (Optional)</Label>
                <select
                  value={newTicket.event_id}
                  onChange={(e) => setNewTicket({ ...newTicket, event_id: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-600 text-white rounded-md px-3 py-2"
                >
                  <option value="">All Events</option>
                  {tourData.events.map((event) => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm">Quantity Available</Label>
                <Input
                  type="number"
                  placeholder="Enter quantity..."
                  value={newTicket.quantity || ''}
                  onChange={(e) => setNewTicket({ ...newTicket, quantity: parseInt(e.target.value) || 0 })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm">Max Per Customer</Label>
                <Input
                  type="number"
                  placeholder="4"
                  value={newTicket.max_per_customer || ''}
                  onChange={(e) => setNewTicket({ ...newTicket, max_per_customer: parseInt(e.target.value) || 4 })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm">Sale Start Date</Label>
                <Input
                  type="date"
                  value={newTicket.sale_start || ''}
                  onChange={(e) => setNewTicket({ ...newTicket, sale_start: e.target.value })}
                  className="bg-slate-800/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm">Sale End Date</Label>
                <Input
                  type="date"
                  value={newTicket.sale_end || ''}
                  onChange={(e) => setNewTicket({ ...newTicket, sale_end: e.target.value })}
                  className="bg-slate-800/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-white text-sm">Description</Label>
                <Textarea
                  placeholder="Describe what's included..."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px]"
                />
              </div>
            </div>

            {/* Third Party Ticketing */}
            <div className="mt-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newTicket.is_third_party}
                  onCheckedChange={(checked) => setNewTicket({ ...newTicket, is_third_party: checked })}
                />
                <Label className="text-white text-sm">Use Third-Party Ticketing</Label>
              </div>
              
              {newTicket.is_third_party && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Third-Party URL</Label>
                    <Input
                      placeholder="e.g., https://ticketmaster.com/event/..."
                      value={newTicket.third_party_url}
                      onChange={(e) => setNewTicket({ ...newTicket, third_party_url: e.target.value })}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Third-Party Fee ($)</Label>
                    <Input
                      type="number"
                      placeholder="Enter fee amount..."
                      value={newTicket.third_party_fee || ''}
                      onChange={(e) => setNewTicket({ ...newTicket, third_party_fee: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Benefits */}
            <div className="mt-4 space-y-2">
              <Label className="text-white text-sm">Benefits & Perks</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Meet & Greet, VIP Lounge Access..."
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  className="flex-1 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                />
                <Button
                  type="button"
                  onClick={addBenefit}
                  disabled={!newBenefit.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Add
                </Button>
              </div>
              {newTicket.benefits.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newTicket.benefits.map((benefit, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {benefit}
                      <button
                        type="button"
                        onClick={() => removeBenefit(index)}
                        className="ml-1 text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex space-x-2 mt-4">
              <Button
                onClick={handleAddTicket}
                disabled={!newTicket.name || newTicket.price <= 0}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Add Ticket Type
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddingTicket(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Quick Ticket Type Suggestions */}
        <div className="space-y-4">
          <h4 className="text-white font-medium">Quick Add Common Ticket Types</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {commonTicketTypes.map((type) => (
              <Card
                key={type}
                className="p-3 bg-slate-900/30 border-slate-700 hover:border-purple-500/40 cursor-pointer transition-colors"
                onClick={() => {
                  setNewTicket({
                    ...newTicket,
                    name: type,
                    price: type === 'VIP' ? 150 : type === 'Early Bird' ? 45 : 75,
                    quantity: 100,
                    description: `${type} ticket for the tour`
                  })
                  setIsAddingTicket(true)
                }}
              >
                <div className="space-y-1">
                  <div className="font-medium text-white">{type}</div>
                  <div className="text-sm text-slate-400">Click to add</div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Ticket Types List - Grouped by Event */}
        {Object.keys(ticketsByEvent).length > 0 && (
          <div className="space-y-6">
            {Object.entries(ticketsByEvent).map(([eventId, tickets]) => (
              <div key={eventId} className="space-y-3">
                <h4 className="text-white font-medium flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{getEventName(eventId)}</span>
                  {eventId !== 'general' && (
                    <Badge variant="outline" className="text-xs">
                      {tourData.events.find(e => e.id === eventId)?.venue}
                    </Badge>
                  )}
                </h4>
                <div className="space-y-3">
                  {tickets.map((ticket, index) => (
                    <Card key={ticket.id} className="p-4 bg-slate-900/30 border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Ticket className="w-4 h-4 text-purple-400" />
                            <h4 className="font-medium text-white">{ticket.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              ${ticket.price}
                            </Badge>
                            {ticket.quantity > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {ticket.quantity} available
                              </Badge>
                            )}
                            {ticket.is_third_party && (
                              <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/40">
                                Third Party
                              </Badge>
                            )}
                          </div>
                          {ticket.description && (
                            <p className="text-sm text-slate-400">{ticket.description}</p>
                          )}
                          {ticket.benefits && ticket.benefits.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {ticket.benefits.map((benefit, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {benefit}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {ticket.is_third_party && ticket.third_party_url && (
                            <div className="mt-2">
                              <a
                                href={ticket.third_party_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>View on Third-Party Site</span>
                              </a>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTicket(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State for Tickets */}
        {tourData.ticketTypes.length === 0 && (
          <Card className="p-8 bg-slate-900/30 border-slate-700 border-dashed">
            <div className="text-center">
              <Ticket className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Ticket Types Added</h3>
              <p className="text-slate-400 mb-4">
                Ticket information is optional at tour creation and can be added later in the Ticketing & Finances tab.
              </p>
              <Button onClick={() => setIsAddingTicket(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add First Ticket Type
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Budget & Expenses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Budget & Expenses</h3>
          </div>
          <Button
            onClick={() => setIsAddingExpense(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>

        {/* Add Expense Form */}
        {isAddingExpense && (
          <Card className="p-6 bg-slate-900/30 border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white text-sm">Expense Category *</Label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-600 text-white rounded-md px-3 py-2"
                >
                  <option value="">Select category...</option>
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm">Amount ($) *</Label>
                <Input
                  type="number"
                  placeholder="Enter amount..."
                  value={newExpense.amount || ''}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-white text-sm">Description</Label>
                <Textarea
                  placeholder="Enter expense description..."
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px]"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button
                onClick={handleAddExpense}
                disabled={!newExpense.category || newExpense.amount <= 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add Expense
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddingExpense(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Expenses List */}
        <div className="space-y-3">
          {tourData.budget.expenses.map((expense, index) => (
            <Card key={index} className="p-4 bg-slate-900/30 border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <h4 className="font-medium text-white">{expense.category}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {formatSafeCurrency(expense.amount)}
                    </Badge>
                  </div>
                  {expense.description && (
                    <p className="text-sm text-slate-400">{expense.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveExpense(index)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Sponsors */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Sponsors & Partners</h3>
          </div>
          <Button
            onClick={() => setIsAddingSponsor(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Sponsor
          </Button>
        </div>

        {/* Add Sponsor Form */}
        {isAddingSponsor && (
          <Card className="p-6 bg-slate-900/30 border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white text-sm">Sponsor Name *</Label>
                <Input
                  placeholder="Enter sponsor name..."
                  value={newSponsor.name}
                  onChange={(e) => setNewSponsor({ ...newSponsor, name: e.target.value })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm">Sponsor Type</Label>
                <select
                  value={newSponsor.type}
                  onChange={(e) => setNewSponsor({ ...newSponsor, type: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-600 text-white rounded-md px-3 py-2"
                >
                  <option value="">Select type...</option>
                  {sponsorTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm">Contribution ($) *</Label>
                <Input
                  type="number"
                  placeholder="Enter contribution amount..."
                  value={newSponsor.contribution || ''}
                  onChange={(e) => setNewSponsor({ ...newSponsor, contribution: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button
                onClick={handleAddSponsor}
                disabled={!newSponsor.name || newSponsor.contribution <= 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Add Sponsor
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddingSponsor(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Sponsors List */}
        <div className="space-y-3">
          {tourData.sponsors.map((sponsor, index) => (
            <Card key={index} className="p-4 bg-slate-900/30 border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <CreditCard className="w-4 h-4 text-green-400" />
                    <h4 className="font-medium text-white">{sponsor.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {formatSafeCurrency(sponsor.contribution)}
                    </Badge>
                    {sponsor.type && (
                      <Badge variant="outline" className="text-xs">
                        {sponsor.type}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSponsor(index)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Financial Summary */}
      <Card className="p-6 bg-slate-900/30 border-slate-700">
        <div className="flex items-center space-x-2 mb-4">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h4 className="text-lg font-semibold text-white">Financial Summary</h4>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Ticket Revenue:</span>
            <span className="text-white">{formatSafeCurrency(totalTicketRevenue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Sponsor Contributions:</span>
            <span className="text-white">{formatSafeCurrency(totalSponsorContributions)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Expenses:</span>
            <span className="text-red-400">-{formatSafeCurrency(totalExpenses)}</span>
          </div>
          <div className="border-t border-slate-700 pt-3">
            <div className="flex justify-between font-semibold">
              <span className="text-white">Net Profit/Loss:</span>
              <span className={netProfit >= 0 ? "text-green-400" : "text-red-400"}>
                {formatSafeCurrency(netProfit)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Validation Status */}
      <div className="flex items-center space-x-2 text-sm">
        {tourData.ticketTypes.length > 0 || tourData.budget.expenses.length > 0 || tourData.sponsors.length > 0 ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400">Financial planning completed</span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
            <span className="text-slate-400">Optional: Add ticket types, expenses, or sponsors to continue</span>
          </>
        )}
      </div>
    </div>
  )
} 