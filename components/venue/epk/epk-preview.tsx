"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, ExternalLink, Globe, Mail, MapPin, Music, Phone } from "lucide-react"

interface EPKPreviewProps {
  epkData: any
  isPremium?: boolean
}

export function EPKPreview({ epkData, isPremium = true }: EPKPreviewProps) {
  const [activeTab, setActiveTab] = useState("overview")

  if (!epkData) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">EPK Preview</h1>
          <p className="text-gray-400">This is how your EPK will appear to others</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-gray-700">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          {!isPremium && (
            <Button>
              <Badge className="mr-2 bg-purple-600">Premium</Badge>
              Upgrade
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-800 overflow-hidden">
        <div className="h-48 bg-gradient-to-r from-purple-900 to-blue-900 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-4xl font-bold text-white">{epkData.fullName}</h1>
          </div>
        </div>

        <div className="px-6 -mt-12 flex justify-between items-end">
          <Avatar className="h-24 w-24 border-4 border-gray-900">
            <AvatarImage src={epkData.avatar || "/placeholder.svg?height=96&width=96"} alt={epkData.fullName} />
            <AvatarFallback>
              {epkData.fullName
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>

          <div className="flex gap-2 mb-4">
            <Button size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Contact
            </Button>
            <Button variant="outline" size="sm" className="border-gray-700">
              <Music className="h-4 w-4 mr-2" />
              Listen
            </Button>
          </div>
        </div>

        <CardHeader className="pt-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
              <CardTitle className="text-2xl">{epkData.title}</CardTitle>
              <CardDescription className="flex items-center mt-1">
                <MapPin className="h-4 w-4 mr-1" />
                {epkData.location}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              {epkData.genres?.map((genre: string, index: number) => (
                <Badge key={index} variant="outline" className="border-gray-700">
                  {genre}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-800 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="music">Music</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="press">Press</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Bio</h3>
                <p className="text-gray-300 whitespace-pre-line">{epkData.bio}</p>
              </div>

              {epkData.experience && epkData.experience.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Experience</h3>
                  <div className="space-y-4">
                    {epkData.experience.map((exp: any) => (
                      <div key={exp.id} className="bg-gray-800/50 p-4 rounded-lg">
                        <h4 className="font-medium">{exp.title}</h4>
                        <p className="text-sm text-gray-400">
                          {exp.company} • {exp.period}
                        </p>
                        <p className="mt-2 text-sm">{exp.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {epkData.skills && epkData.skills.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {epkData.skills.map((skill: string, index: number) => (
                      <Badge key={index} variant="outline" className="border-gray-700">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="music" className="mt-6">
              {isPremium ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Featured Tracks</h3>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-gray-800/50 p-4 rounded-lg flex items-center gap-4">
                        <div className="h-12 w-12 bg-gray-700 rounded-md flex items-center justify-center">
                          <Music className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Track Title {i}</h4>
                          <p className="text-sm text-gray-400">Album Name • 3:45</p>
                        </div>
                        <Button variant="outline" size="sm" className="border-gray-700">
                          Play
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Music className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                  <h3 className="text-lg font-medium mb-2">Music Player Available in Premium</h3>
                  <p className="text-gray-400 mb-4">
                    Upgrade to premium to showcase your music with an embedded player
                  </p>
                  <Button>
                    <Badge className="mr-2 bg-purple-600">Premium</Badge>
                    Upgrade Now
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="photos" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Gallery</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {epkData.gallery && epkData.gallery.length > 0 ? (
                    epkData.gallery.map((item: any) => (
                      <div key={item.id} className="aspect-square rounded-md overflow-hidden">
                        <img
                          src={item.url || "/placeholder.svg"}
                          alt={item.alt}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-12 bg-gray-800/50 rounded-lg">
                      <p className="text-gray-400">No photos added yet</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="videos" className="mt-6">
              {isPremium ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Featured Videos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <h4 className="font-medium">Video Title {i}</h4>
                          <p className="text-sm text-gray-400">Click to play</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ExternalLink className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                  <h3 className="text-lg font-medium mb-2">Video Integration Available in Premium</h3>
                  <p className="text-gray-400 mb-4">
                    Upgrade to premium to embed videos from YouTube, Vimeo, and other platforms
                  </p>
                  <Button>
                    <Badge className="mr-2 bg-purple-600">Premium</Badge>
                    Upgrade Now
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="press" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Press & Reviews</h3>
                {epkData.reviews && epkData.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {epkData.reviews.map((review: any) => (
                      <div key={review.id} className="bg-gray-800/50 p-4 rounded-lg">
                        <p className="italic">"{review.comment}"</p>
                        <div className="mt-2 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{review.name}</p>
                            <p className="text-sm text-gray-400">{review.position}</p>
                          </div>
                          <p className="text-sm text-gray-400">{review.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400">No press or reviews added yet</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="contact" className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <span>booking@example.com</span>
                      </div>
                      {isPremium && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-5 w-5 text-gray-400" />
                          <span>+1 (555) 123-4567</span>
                        </div>
                      )}
                      {isPremium && (
                        <div className="flex items-center gap-3">
                          <Globe className="h-5 w-5 text-gray-400" />
                          <span>www.artistwebsite.com</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Upcoming Events</h3>
                    {epkData.events && epkData.events.length > 0 ? (
                      <div className="space-y-3">
                        {epkData.events.map((event: any) => (
                          <div key={event.id} className="bg-gray-800/50 p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-5 w-5 text-gray-400" />
                              <div>
                                <h4 className="font-medium">{event.title}</h4>
                                <p className="text-sm text-gray-400">{event.date}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-800/50 rounded-lg">
                        <p className="text-gray-400">No upcoming events</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Social Media</h3>
                  <div className="flex flex-wrap gap-2">
                    {isPremium ? (
                      <>
                        <Button variant="outline" size="sm" className="border-gray-700">
                          <svg
                            className="h-4 w-4 mr-2"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                          </svg>
                          Instagram
                        </Button>
                        <Button variant="outline" size="sm" className="border-gray-700">
                          <svg
                            className="h-4 w-4 mr-2"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                          </svg>
                          YouTube
                        </Button>
                        <Button variant="outline" size="sm" className="border-gray-700">
                          <svg
                            className="h-4 w-4 mr-2"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                          </svg>
                          Facebook
                        </Button>
                        <Button variant="outline" size="sm" className="border-gray-700">
                          <svg
                            className="h-4 w-4 mr-2"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4.441 16.892c-2.102.144-6.784.144-8.883 0-2.276-.156-2.541-1.27-2.558-4.892.017-3.629.285-4.736 2.558-4.892 2.099-.144 6.782-.144 8.883 0 2.277.156 2.541 1.27 2.559 4.892-.018 3.629-.285 4.736-2.559 4.892zm-6.441-7.234l4.917 2.338-4.917 2.346v-4.684z" />
                          </svg>
                          Spotify
                        </Button>
                      </>
                    ) : (
                      <div className="w-full text-center py-6 bg-gray-800/50 rounded-lg">
                        <p className="text-gray-400 mb-4">Unlimited social links available in Premium</p>
                        <Button size="sm">
                          <Badge className="mr-2 bg-purple-600">Premium</Badge>
                          Upgrade Now
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
