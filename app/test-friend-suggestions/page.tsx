import { SimpleFriendSuggestions } from "@/components/social/simple-friend-suggestions"

export default function TestFriendSuggestionsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Friend Suggestions Test</h1>
          <p className="text-muted-foreground">
            Testing the simplified friend suggestions component
          </p>
        </div>

        <SimpleFriendSuggestions limit={5} />
        
        <div className="text-sm text-muted-foreground text-center">
          <p>This is a simplified version that avoids complex imports and chunk loading issues.</p>
          <p>If this works, we can gradually add more features back.</p>
        </div>
      </div>
    </div>
  )
}




