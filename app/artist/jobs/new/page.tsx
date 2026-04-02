"use client"

// Prevent pre-rendering since this page requires auth state
export const dynamic = 'force-dynamic'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"

interface JobCategory {
  id: string
  name: string
}

export default function NewJobPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [budget, setBudget] = useState("")
  const [location, setLocation] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [categories, setCategories] = useState<JobCategory[]>([])
  const [questions, setQuestions] = useState<string[]>([])
  const [documents, setDocuments] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/artist-jobs/categories")
        const payload = await response.json()
        if (!payload.success) return

        const availableCategories = payload.data || []
        setCategories(availableCategories)
        if (!categoryId && availableCategories.length > 0) setCategoryId(availableCategories[0].id)
      } catch (error) {
        console.error("Failed to load categories:", error)
      }
    }

    fetchCategories()
  }, [])

  const handleAddQuestion = () => {
    setQuestions([...questions, ""])
  }

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[index] = value
    setQuestions(newQuestions)
  }

  const handleAddDocument = () => {
    setDocuments([...documents, ""])
  }

  const handleRemoveDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index))
  }

  const handleDocumentChange = (index: number, value: string) => {
    const newDocuments = [...documents]
    newDocuments[index] = value
    setDocuments(newDocuments)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/artist-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          category_id: categoryId,
          job_type: "one_time",
          payment_type: "paid",
          payment_amount: budget ? Number(budget) : null,
          payment_currency: "USD",
          location,
          location_type: location ? "in_person" : null,
          required_skills: questions.filter(q => q.trim() !== ""),
          required_equipment: documents.filter(d => d.trim() !== ""),
          contact_email: user?.email || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create job")
      }

      toast({
        title: "Job posted",
        description: "Your opportunity is now live on the jobs board.",
      })
      router.push("/artist/jobs")
    } catch (error) {
      console.error("Error creating job:", error)
      toast({
        title: "Could not post job",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <Card className="max-w-md w-full bg-slate-800/80 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Sign in required</CardTitle>
            <CardDescription className="text-slate-400">
              Please sign in to post a job opportunity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")} className="w-full bg-purple-600 hover:bg-purple-700">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Post a New Job</h1>
        <p className="text-slate-300 mt-2">
          Create a role and onboard talent with a consistent hiring flow.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="bg-slate-800/60 border-slate-700/60">
          <CardHeader>
            <CardTitle className="text-white">Job Details</CardTitle>
            <CardDescription className="text-slate-400">
              Fill in the details about the position you're hiring for.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-slate-200">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="bg-slate-900/60 border-slate-600 text-slate-100">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id} className="text-slate-100">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-200">Job Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Photographer for Music Festival"
                className="bg-slate-900/60 border-slate-600 text-slate-100"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-200">Job Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the job responsibilities, requirements, and any other important details..."
                className="min-h-[150px] bg-slate-900/60 border-slate-600 text-slate-100"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-slate-200">Budget</Label>
                <Input
                  id="budget"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. 500"
                  className="bg-slate-900/60 border-slate-600 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-slate-200">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. New York, NY or Remote"
                  className="bg-slate-900/60 border-slate-600 text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-100">Screening Questions</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddQuestion} className="border-slate-600 text-slate-200">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>

              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <Label className="text-slate-200">Question {index + 1}</Label>
                      <Input
                        value={question}
                        onChange={(e) => handleQuestionChange(index, e.target.value)}
                        placeholder="Enter your question here..."
                        className="bg-slate-900/60 border-slate-600 text-slate-100"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-slate-300 hover:text-white"
                      onClick={() => handleRemoveQuestion(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-100">Required Documents</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddDocument} className="border-slate-600 text-slate-200">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              </div>

              <div className="space-y-4">
                {documents.map((document, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <Label className="text-slate-200">Document Type</Label>
                      <Input
                        value={document}
                        onChange={(e) => handleDocumentChange(index, e.target.value)}
                        placeholder="e.g. Portfolio, Resume, References"
                        className="bg-slate-900/60 border-slate-600 text-slate-100"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-slate-300 hover:text-white"
                      onClick={() => handleRemoveDocument(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Posting..." : "Post Job"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
      </div>
    </div>
  )
} 