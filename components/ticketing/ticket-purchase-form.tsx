"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Ticket, CreditCard, CheckCircle, AlertCircle, Tag, Gift } from 'lucide-react'
import { ticketingService } from '@/lib/services/ticketing.service'
import { type TicketType, type PromoCode } from '@/types/ticketing'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface Event {
  id: string
  title: string
  date: string
  location: string
}

interface EventTicketingConfig {
  refund_policy: string | null
  terms_text: string | null
  transfer_policy: string | null
  resale_enabled: boolean
}

interface TicketPurchaseFormProps {
  eventId: string
  event: Event
  onSuccess?: (orderNumber: string) => void
}

export function TicketPurchaseForm({ eventId, event, onSuccess }: TicketPurchaseFormProps) {
  const { toast } = useToast()
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [ticketingConfig, setTicketingConfig] = useState<EventTicketingConfig | null>(null)
  const [selectedTicketType, setSelectedTicketType] = useState<TicketType | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [promoCode, setPromoCode] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [validatedPromoCode, setValidatedPromoCode] = useState<PromoCode | null>(null)
  const [showPromoSection, setShowPromoSection] = useState(false)
  const [showReferralSection, setShowReferralSection] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [availability, setAvailability] = useState<{ available: number; can_purchase: boolean } | null>(null)
  const [feeBreakdown, setFeeBreakdown] = useState<{ subtotal: number; discountAmount: number; platformFeeAmount: number; processingFeeAmount: number; taxAmount: number; buyerTotal: number } | null>(null)

  useEffect(() => {
    fetchTicketTypes()
  }, [eventId])

  useEffect(() => {
    if (selectedTicketType) {
      checkAvailability()
    }
  }, [selectedTicketType, quantity, promoCode])

  const fetchTicketTypes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ticketing/enhanced?action=event_tickets&event_id=${eventId}`)
      const data = await response.json()

      if (response.ok) {
        setTicketTypes(data.ticket_types || [])
        setTicketingConfig(data.ticketing_config ?? null)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load ticket types',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching ticket types:', error)
      toast({
        title: 'Error',
        description: 'Failed to load ticket types',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const checkAvailability = async () => {
    if (!selectedTicketType) return

    try {
      const response = await fetch('/api/ticketing/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_availability',
          ticket_type_id: selectedTicketType.id,
          quantity,
          promo_code: promoCode || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        setAvailability({
          available: data.available ?? 0,
          can_purchase: Boolean(data.can_purchase),
        })
        setFeeBreakdown(data.fee_breakdown ?? null)
      } else {
        console.error('Availability check failed:', data.error)
        setAvailability(null)
      }
    } catch (error) {
      console.error('Error checking availability:', error)
    }
  }

  const validatePromoCode = async () => {
    if (!promoCode.trim() || !selectedTicketType) return

    try {
      const purchaseAmount = selectedTicketType.price * quantity
      const data = await ticketingService.validatePromoCode(
        promoCode,
        eventId,
        purchaseAmount,
        selectedTicketType.id
      )

      if (data.valid) {
        setValidatedPromoCode(data.promo_code)
        toast({
          title: 'Promo Code Applied!',
          description: `You'll save ${data.discount_amount} on your purchase`,
        })
      } else {
        setValidatedPromoCode(null)
        toast({
          title: 'Invalid Promo Code',
          description: data.error || 'This promo code is not valid',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error validating promo code:', error)
      toast({
        title: 'Error',
        description: 'Failed to validate promo code',
        variant: 'destructive'
      })
    }
  }

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTicketType || !availability?.can_purchase) {
      toast({
        title: 'Cannot Purchase',
        description: 'Selected tickets are not available',
        variant: 'destructive'
      })
      return
    }

    if (!customerInfo.name || !customerInfo.email) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in your name and email',
        variant: 'destructive'
      })
      return
    }

    if (!termsAccepted) {
      toast({
        title: 'Terms required',
        description: 'Please accept the Ticket Buyer Terms and organizer policies to continue',
        variant: 'destructive'
      })
      return
    }

    setPurchasing(true)

    try {
      const purchaseData = {
        ticket_type_id: selectedTicketType.id,
        event_id: eventId,
        customer_email: customerInfo.email,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone || undefined,
        quantity,
        promo_code: promoCode || undefined,
        referral_code: referralCode || undefined,
        social_media_share: true,
        terms_accepted: true,
      }

      const result = await ticketingService.purchaseTickets(purchaseData)

      if ((result as any).checkout_url) {
        window.location.href = (result as any).checkout_url
        return
      }

      toast({
        title: 'Purchase Successful!',
        description: `Your tickets have been confirmed. Order #${result.order_number}`,
      })

      // Reset form
      setSelectedTicketType(null)
      setQuantity(1)
      setCustomerInfo({ name: '', email: '', phone: '' })
      setPromoCode('')
      setReferralCode('')
      setValidatedPromoCode(null)
      setAvailability(null)
      setTermsAccepted(false)

      onSuccess?.(result.order_number)

      // Refresh ticket types to update availability
      fetchTicketTypes()

    } catch (error: any) {
      console.error('Purchase error:', error)
      const message = String(error.message || '')
      if (message.includes('Sign in') || message.includes('AUTH_REQUIRED') || message.includes('401')) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to purchase tickets so they appear in your wallet.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Purchase Failed',
          description: error.message || 'Failed to complete purchase. Please try again.',
          variant: 'destructive'
        })
      }
    } finally {
      setPurchasing(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return formatSafeDate(dateString)
  }

  const calculateTotal = () => {
    if (!selectedTicketType) return 0
    
    const subtotal = selectedTicketType.price * quantity
    const discount = validatedPromoCode ? 
      (validatedPromoCode.discount_type === 'percentage' 
        ? (subtotal * validatedPromoCode.discount_value / 100)
        : validatedPromoCode.discount_value) : 0

    const afterDiscount = Math.max(0, subtotal - discount)
    return feeBreakdown?.buyerTotal ?? Math.max(0, afterDiscount)
  }

  const getFeePreviewLines = () => {
    if (!selectedTicketType) return null
    const subtotal = selectedTicketType.price * quantity
    const discount = getDiscountAmount()
    const afterDiscount = Math.max(0, subtotal - discount)
    if (feeBreakdown) return { subtotal: feeBreakdown.subtotal, discount: feeBreakdown.discountAmount, platformFee: feeBreakdown.platformFeeAmount, processingFee: feeBreakdown.processingFeeAmount, tax: feeBreakdown.taxAmount, total: feeBreakdown.buyerTotal }
    return { subtotal, discount, platformFee: 0, processingFee: 0, tax: 0, total: afterDiscount }
  }

  const getDiscountAmount = () => {
    if (!selectedTicketType || !validatedPromoCode) return 0
    
    const subtotal = selectedTicketType.price * quantity
    return validatedPromoCode.discount_type === 'percentage' 
      ? (subtotal * validatedPromoCode.discount_value / 100)
      : validatedPromoCode.discount_value
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="space-y-6">
      {/* Ticket Types Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Select Your Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ticketTypes.map((ticketType) => (
              <div
                key={ticketType.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedTicketType?.id === ticketType.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedTicketType(ticketType)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{ticketType.name}</h3>
                      {ticketType.category && (
                        <Badge variant="secondary">{ticketType.category}</Badge>
                      )}
                      {ticketType.featured && (
                        <Badge variant="default">Featured</Badge>
                      )}
                    </div>
                    
                    {ticketType.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {ticketType.description}
                      </p>
                    )}

                    {ticketType.benefits && ticketType.benefits.length > 0 && (
                      <div className="text-sm text-muted-foreground mb-2">
                        <strong>Includes:</strong> {ticketType.benefits.join(', ')}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-semibold text-lg">
                        {formatPrice(ticketType.price)}
                      </span>
                      <span className="text-muted-foreground">
                        {Math.max(0, ticketType.quantity_available - ticketType.quantity_sold - Number((ticketType as any).quantity_reserved || 0))} available
                      </span>
                    </div>

                    {ticketType.quantity_available > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Sold</span>
                          <span>{Math.round((ticketType.quantity_sold / ticketType.quantity_available) * 100)}%</span>
                        </div>
                        <Progress 
                          value={(ticketType.quantity_sold / ticketType.quantity_available) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    {selectedTicketType?.id === ticketType.id ? (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-border rounded-full" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      </div>
      {selectedTicketType && (
        <form onSubmit={handlePurchase} className="space-y-6 lg:sticky lg:top-6">
          {/* Quantity Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label htmlFor="quantity">Number of tickets:</Label>
                <div className="flex items-center border rounded-md">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={selectedTicketType.max_per_customer ? quantity >= selectedTicketType.max_per_customer : false}
                  >
                    +
                  </Button>
                </div>
                {selectedTicketType.max_per_customer && (
                  <span className="text-sm text-muted-foreground">
                    Max {selectedTicketType.max_per_customer} per customer
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Promo Code Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Promo Code
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPromoSection(!showPromoSection)}
                >
                  {showPromoSection ? 'Hide' : 'Add'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showPromoSection && (
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  />
                  <Button
                    type="button"
                    onClick={validatePromoCode}
                    disabled={!promoCode.trim()}
                  >
                    Apply
                  </Button>
                </div>
                {validatedPromoCode && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">
                      ✓ {validatedPromoCode.description || 'Promo code applied'}
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Referral Code Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Referral Code
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReferralSection(!showReferralSection)}
                >
                  {showReferralSection ? 'Hide' : 'Add'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showReferralSection && (
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Tickets ({quantity}x {selectedTicketType.name})</span>
                  <span>{formatPrice(selectedTicketType.price * quantity)}</span>
                </div>
                
                {validatedPromoCode && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({validatedPromoCode.code})</span>
                    <span>-{formatPrice(getDiscountAmount())}</span>
                  </div>
                )}

                {(() => {
                  const fees = getFeePreviewLines()
                  if (!fees) return null
                  return (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Platform fee</span>
                        <span>{formatPrice(fees.platformFee)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Processing fee</span>
                        <span>{formatPrice(fees.processingFee)}</span>
                      </div>
                      {fees.tax > 0 ? <div className="flex justify-between text-sm text-muted-foreground"><span>Tax</span><span>{formatPrice(fees.tax)}</span></div> : null}
                    </>
                  )
                })()}

                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(calculateTotal())}</span>
                  </div>
                </div>

                {availability && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      {availability.can_purchase ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm">
                        {availability.can_purchase 
                          ? `${availability.available} tickets available`
                          : 'Selected quantity not available'
                        }
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Organizer terms & platform buyer terms */}
          <Card>
            <CardHeader>
              <CardTitle>Terms &amp; Policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticketingConfig?.refund_policy ? (
                <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                  <p className="font-medium mb-1">Organizer refund policy</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{ticketingConfig.refund_policy}</p>
                </div>
              ) : null}
              {ticketingConfig?.terms_text ? (
                <div className="rounded-md border border-border bg-muted/40 p-3 text-sm max-h-40 overflow-y-auto">
                  <p className="font-medium mb-1">Organizer terms</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{ticketingConfig.terms_text}</p>
                </div>
              ) : null}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="ticket-terms-accepted"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                />
                <Label htmlFor="ticket-terms-accepted" className="text-sm leading-relaxed cursor-pointer">
                  I agree to the{' '}
                  <Link href="/legal/ticket-buyer-terms" target="_blank" className="text-primary underline">
                    Ticket Buyer Terms
                  </Link>
                  {ticketingConfig?.terms_text || ticketingConfig?.refund_policy
                    ? ' and the organizer policies shown above'
                    : ''}
                  .
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!availability?.can_purchase || purchasing || !termsAccepted}
          >
            {purchasing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Purchase Tickets - {formatPrice(calculateTotal())}
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">Your price is confirmed by Tourify before payment. Ticket passes appear in your wallet after checkout.</p>
        </form>
      )}
    </div>
  )
}
