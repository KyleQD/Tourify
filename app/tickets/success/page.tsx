"use client"

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Download, Mail, Ticket, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface TicketPurchase {
  order_number: string
  customer_name: string
  customer_email: string
  quantity: number
  total_amount: number
  purchase_date: string
  ticket_type: {
    name: string
    price: number
  }
  event: {
    title: string
    date: string
    location: string
  }
}

export default function TicketSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [purchase, setPurchase] = useState<TicketPurchase | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionId) {
      verifyPurchase()
    }
  }, [sessionId])

  const verifyPurchase = async () => {
    try {
      const response = await fetch(`/api/ticketing/verify?session_id=${sessionId}`)
      const data = await response.json()

      if (response.ok) {
        setPurchase(data.purchase)
      }
    } catch (error) {
      console.error('Error verifying purchase:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadTickets = () => {
    // TODO: Generate and download PDF tickets
    console.log('Downloading tickets...')
  }

  const sendEmailTickets = () => {
    // TODO: Send tickets via email
    console.log('Sending tickets via email...')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Verifying your purchase...</p>
        </div>
      </div>
    )
  }

  if (!purchase) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700 max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Purchase Not Found</h2>
            <p className="text-slate-400 mb-4">
              We couldn't verify your ticket purchase. Please contact support if you believe this is an error.
            </p>
            <Link href="/">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Return Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Purchase Successful!</h1>
          <p className="text-slate-400">
            Your tickets have been confirmed and are ready for download.
          </p>
        </div>

        {/* Order Summary */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Ticket className="mr-2 h-5 w-5 text-purple-500" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Order Number:</span>
              <span className="text-white font-mono">{purchase.order_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Customer:</span>
              <span className="text-white">{purchase.customer_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Quantity:</span>
              <span className="text-white">{purchase.quantity} ticket{purchase.quantity > 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Amount:</span>
              <span className="text-white font-bold">
                ${purchase.total_amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Purchase Date:</span>
              <span className="text-white">
                {formatSafeDate(purchase.purchase_date)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">{purchase.event.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-purple-500" />
              <span className="text-slate-300">
                {formatSafeDate(purchase.event.date)}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-purple-500" />
              <span className="text-slate-300">{purchase.event.location}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                {purchase.ticket_type.name}
              </Badge>
              <span className="text-slate-400">
                ${purchase.ticket_type.price.toFixed(2)} per ticket
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Button
            onClick={downloadTickets}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Tickets
          </Button>
          <Button
            onClick={sendEmailTickets}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-700"
          >
            <Mail className="mr-2 h-4 w-4" />
            Email Tickets
          </Button>
        </div>

        {/* Additional Information */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-3">What's Next?</h3>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start space-x-2">
                <span className="text-purple-400">•</span>
                <span>Your tickets will be sent to {purchase.customer_email}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-400">•</span>
                <span>Please arrive 30 minutes before the event starts</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-400">•</span>
                <span>Bring a valid ID and your ticket confirmation</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-400">•</span>
                <span>Contact support if you need to make changes</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="text-center mt-8 space-x-4">
          <Link href="/">
            <Button variant="outline" className="border-slate-700 text-slate-300">
              Return Home
            </Button>
          </Link>
          <Link href="/tickets/my-tickets">
            <Button className="bg-purple-600 hover:bg-purple-700">
              View My Tickets
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 