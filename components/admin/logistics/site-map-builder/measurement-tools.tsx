'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Ruler, 
  Square, 
  Triangle, 
  Compass, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Info,
  Settings,
  Zap
} from 'lucide-react'
import { 
  MeasurementTool, 
  ComplianceRule, 
  DEFAULT_COMPLIANCE_RULES,
  MEASUREMENT_TOOLS 
} from '@/types/measurements'

interface MeasurementToolsProps {
  activeTool: string | null
  onToolSelect: (toolId: string) => void
  onComplianceRuleToggle: (ruleId: string, enabled: boolean) => void
  enabledComplianceRules: string[]
  className?: string
}

export function MeasurementTools({
  activeTool,
  onToolSelect,
  onComplianceRuleToggle,
  enabledComplianceRules,
  className
}: MeasurementToolsProps) {
  const [showComplianceRules, setShowComplianceRules] = useState(false)

  // Enhanced measurement tools with icons
  const measurementTools: MeasurementTool[] = [
    {
      ...MEASUREMENT_TOOLS[0],
      icon: Ruler
    },
    {
      ...MEASUREMENT_TOOLS[1],
      icon: Square
    },
    {
      ...MEASUREMENT_TOOLS[2],
      icon: Shield
    },
    {
      ...MEASUREMENT_TOOLS[3],
      icon: Triangle
    },
    {
      ...MEASUREMENT_TOOLS[4],
      icon: Compass
    }
  ]

  const getComplianceIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'medium': return <Info className="h-4 w-4 text-yellow-500" />
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />
      default: return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getComplianceColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className={`w-full h-full bg-transparent ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Ruler className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Measurement Tools</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComplianceRules(!showComplianceRules)}
            className="hover:bg-purple-100"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Measurement Tools */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Tools
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {measurementTools.map((tool) => {
                const IconComponent = tool.icon
                const isActive = activeTool === tool.id
                
                return (
                  <Button
                    key={tool.id}
                    variant={isActive ? "default" : "ghost"}
                    onClick={() => onToolSelect(tool.id)}
                    className={`w-full justify-start h-auto p-3 transition-all duration-200 ${
                      isActive 
                        ? 'bg-purple-600 text-white shadow-md' 
                        : 'hover:bg-purple-50 hover:text-purple-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={`p-2 rounded-lg ${
                        isActive ? 'bg-white/20' : 'bg-purple-100'
                      }`}>
                        <IconComponent className={`h-4 w-4 ${
                          isActive ? 'text-white' : 'text-purple-600'
                        }`} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{tool.name}</div>
                        <div className={`text-xs ${
                          isActive ? 'text-white/80' : 'text-slate-500'
                        }`}>
                          {tool.description}
                        </div>
                      </div>
                      {tool.complianceRules && tool.complianceRules.length > 0 && (
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            isActive 
                              ? 'bg-white/20 text-white border-white/30' 
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {tool.complianceRules.length}
                        </Badge>
                      )}
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Compliance Rules */}
          {showComplianceRules && (
            <>
              <Separator className="my-4" />
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Compliance Rules
                </h4>
                <ScrollArea className="h-64">
                  <div className="space-y-2 pr-2">
                    {DEFAULT_COMPLIANCE_RULES.map((rule) => {
                      const isEnabled = enabledComplianceRules.includes(rule.id)
                      
                      return (
                        <Card 
                          key={rule.id}
                          className={`cursor-pointer transition-all duration-200 ${
                            isEnabled 
                              ? 'bg-purple-50 border-purple-200 shadow-sm' 
                              : 'hover:bg-slate-50'
                          }`}
                          onClick={() => onComplianceRuleToggle(rule.id, !isEnabled)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex items-center gap-2 mt-1">
                                {getComplianceIcon(rule.severity)}
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={() => onComplianceRuleToggle(rule.id, !isEnabled)}
                                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="text-sm font-medium text-slate-900 truncate">
                                    {rule.name}
                                  </h5>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${getComplianceColor(rule.severity)}`}
                                  >
                                    {rule.severity}
                                  </Badge>
                                  {rule.required && (
                                    <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-200">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 mb-2">
                                  {rule.description}
                                </p>
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-slate-500">
                                    Min: {rule.minValue}{rule.unit}
                                    {rule.maxValue && ` - Max: ${rule.maxValue}${rule.unit}`}
                                  </div>
                                  <div className="text-xs text-slate-400 truncate ml-2">
                                    {rule.regulation}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mt-6 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200/50">
          <div className="text-xs text-slate-600 mb-2">Active Compliance Rules</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-slate-700">
                Critical: {DEFAULT_COMPLIANCE_RULES.filter(r => r.severity === 'critical' && enabledComplianceRules.includes(r.id)).length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-slate-700">
                High: {DEFAULT_COMPLIANCE_RULES.filter(r => r.severity === 'high' && enabledComplianceRules.includes(r.id)).length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-slate-700">
                Medium: {DEFAULT_COMPLIANCE_RULES.filter(r => r.severity === 'medium' && enabledComplianceRules.includes(r.id)).length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-slate-700">
                Low: {DEFAULT_COMPLIANCE_RULES.filter(r => r.severity === 'low' && enabledComplianceRules.includes(r.id)).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
