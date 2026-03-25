import { AllUsersDisplay } from "@/components/social/all-users-display"

export default function AllUsersPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">All Users</h1>
          <p className="text-muted-foreground">
            Browse and connect with all users on the platform
          </p>
        </div>

        <AllUsersDisplay limit={20} />
        
        <div className="text-sm text-muted-foreground text-center">
          <p>This shows all users in the system without complex filtering.</p>
          <p>You can connect with anyone you find interesting!</p>
        </div>
      </div>
    </div>
  )
}




