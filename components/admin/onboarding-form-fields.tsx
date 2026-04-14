"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, Upload, X, Plus, MapPin, Phone, Mail, CreditCard, User, AlertTriangle } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { OnboardingField } from '@/lib/services/onboarding-templates.service'

interface FormFieldProps {
  field: OnboardingField
  value: any
  onChange: (value: any) => void
  error?: string
  disabled?: boolean
}

export function OnboardingFormField({ field, value, onChange, error, disabled }: FormFieldProps) {
  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <Input
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={error ? 'border-red-500' : ''}
          />
        )

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground",
                  error && "border-red-500"
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => onChange(date?.toISOString())}
                disabled={disabled}
              />
            </PopoverContent>
          </Popover>
        )

      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {value?.map((item: string, index: number) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {item}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => {
                      if (!disabled) {
                        const newValue = value.filter((_: string, i: number) => i !== index)
                        onChange(newValue)
                      }
                    }}
                  />
                </Badge>
              ))}
            </div>
            <Select
              onValueChange={(selectedValue) => {
                if (!disabled && !value?.includes(selectedValue)) {
                  onChange([...(value || []), selectedValue])
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add options..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.filter(option => !value?.includes(option)).map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={error ? 'border-red-500' : ''}
            rows={4}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className={error ? 'border-red-500' : ''}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        )

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value || false}
              onCheckedChange={onChange}
              disabled={disabled}
            />
            <Label htmlFor={field.id} className="text-sm font-normal">
              {field.label}
            </Label>
          </div>
        )

      case 'file':
        return (
          <div className="space-y-2">
            <Input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  onChange({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    file: file
                  })
                }
              }}
              disabled={disabled}
              className={error ? 'border-red-500' : ''}
            />
            {value && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                {value.name} ({(value.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>
        )

      case 'address':
        return (
          <AddressField value={value} onChange={onChange} disabled={disabled} error={error} />
        )

      case 'emergency_contact':
        return (
          <EmergencyContactField value={value} onChange={onChange} disabled={disabled} error={error} />
        )

      case 'bank_info':
        return (
          <BankInfoField value={value} onChange={onChange} disabled={disabled} error={error} />
        )

      case 'tax_info':
        return (
          <TaxInfoField value={value} onChange={onChange} disabled={disabled} error={error} />
        )

      case 'id_document':
        return (
          <IdDocumentField value={value} onChange={onChange} disabled={disabled} error={error} />
        )

      default:
        return (
          <Input
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={error ? 'border-red-500' : ''}
          />
        )
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.id} className="flex items-center gap-2">
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </Label>
      {renderField()}
      {field.help_text && (
        <p className="text-sm text-muted-foreground">{field.help_text}</p>
      )}
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}

// Complex field components
function AddressField({ value, onChange, disabled, error }: { value: any; onChange: (value: any) => void; disabled?: boolean; error?: string }) {
  const address = value || {}
  
  return (
    <Card className={error ? 'border-red-500' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Address Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Street Address</Label>
            <Input
              placeholder="123 Main St"
              value={address.street || ''}
              onChange={(e) => onChange({ ...address, street: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Apt/Suite</Label>
            <Input
              placeholder="Apt 4B"
              value={address.unit || ''}
              onChange={(e) => onChange({ ...address, unit: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">City</Label>
            <Input
              placeholder="New York"
              value={address.city || ''}
              onChange={(e) => onChange({ ...address, city: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">State</Label>
            <Input
              placeholder="NY"
              value={address.state || ''}
              onChange={(e) => onChange({ ...address, state: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ZIP Code</Label>
            <Input
              placeholder="10001"
              value={address.zip || ''}
              onChange={(e) => onChange({ ...address, zip: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmergencyContactField({ value, onChange, disabled, error }: { value: any; onChange: (value: any) => void; disabled?: boolean; error?: string }) {
  const contact = value || {}
  
  return (
    <Card className={error ? 'border-red-500' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Emergency Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Full Name</Label>
            <Input
              placeholder="John Doe"
              value={contact.name || ''}
              onChange={(e) => onChange({ ...contact, name: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Relationship</Label>
            <Select value={contact.relationship || ''} onValueChange={(val) => onChange({ ...contact, relationship: val })} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spouse">Spouse</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="sibling">Sibling</SelectItem>
                <SelectItem value="friend">Friend</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Phone Number</Label>
            <Input
              type="tel"
              placeholder="(555) 123-4567"
              value={contact.phone || ''}
              onChange={(e) => onChange({ ...contact, phone: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              placeholder="contact@example.com"
              value={contact.email || ''}
              onChange={(e) => onChange({ ...contact, email: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BankInfoField({ value, onChange, disabled, error }: { value: any; onChange: (value: any) => void; disabled?: boolean; error?: string }) {
  const bankInfo = value || {}
  
  return (
    <Card className={error ? 'border-red-500' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Direct Deposit Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Bank Name</Label>
          <Input
            placeholder="Bank of America"
            value={bankInfo.bank_name || ''}
            onChange={(e) => onChange({ ...bankInfo, bank_name: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Account Type</Label>
            <Select value={bankInfo.account_type || ''} onValueChange={(val) => onChange({ ...bankInfo, account_type: val })} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Routing Number</Label>
            <Input
              placeholder="123456789"
              value={bankInfo.routing_number || ''}
              onChange={(e) => onChange({ ...bankInfo, routing_number: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Account Number</Label>
          <Input
            placeholder="1234567890"
            value={bankInfo.account_number || ''}
            onChange={(e) => onChange({ ...bankInfo, account_number: e.target.value })}
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function TaxInfoField({ value, onChange, disabled, error }: { value: any; onChange: (value: any) => void; disabled?: boolean; error?: string }) {
  const taxInfo = value || {}
  
  return (
    <Card className={error ? 'border-red-500' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Tax Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Social Security Number</Label>
          <Input
            placeholder="XXX-XX-XXXX"
            value={taxInfo.ssn || ''}
            onChange={(e) => onChange({ ...taxInfo, ssn: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Filing Status</Label>
            <Select value={taxInfo.filing_status || ''} onValueChange={(val) => onChange({ ...taxInfo, filing_status: val })} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Select filing status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="head_of_household">Head of Household</SelectItem>
                <SelectItem value="married_separate">Married Filing Separately</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Number of Dependents</Label>
            <Input
              type="number"
              placeholder="0"
              value={taxInfo.dependents || ''}
              onChange={(e) => onChange({ ...taxInfo, dependents: Number(e.target.value) })}
              disabled={disabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function IdDocumentField({ value, onChange, disabled, error }: { value: any; onChange: (value: any) => void; disabled?: boolean; error?: string }) {
  const document = value || {}
  
  return (
    <Card className={error ? 'border-red-500' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          ID Document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Document Type</Label>
            <Select value={document.type || ''} onValueChange={(val) => onChange({ ...document, type: val })} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="driver_license">Driver's License</SelectItem>
                <SelectItem value="passport">Passport</SelectItem>
                <SelectItem value="state_id">State ID</SelectItem>
                <SelectItem value="military_id">Military ID</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Document Number</Label>
            <Input
              placeholder="Document number"
              value={document.number || ''}
              onChange={(e) => onChange({ ...document, number: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Document File</Label>
          <Input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                onChange({ ...document, file: file })
              }
            }}
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  )
} 