# 🎵 Artist Jobs System Setup Guide

## 🚀 Quick Start

The artist jobs system is now ready to use! However, you'll need to run the database migration first to enable full functionality.

### 1. Run Database Migration

Go to your **Supabase Dashboard** → **SQL Editor** and run the following migration:

```sql
-- Copy and paste the contents of: supabase/migrations/20241220000000_artist_jobs_system.sql
```

This migration creates:
- `artist_job_categories` - Job categories (Opening Slots, Venue Bookings, etc.)
- `artist_jobs` - Main jobs table
- `artist_job_applications` - Job applications 
- `artist_job_views` - Analytics tracking
- `artist_job_saves` - Saved jobs/bookmarks
- Row Level Security (RLS) policies
- Indexes for performance
- Sample data for testing

### 2. Update Database Types (Optional)

After running the migration, you may want to regenerate your database types:

```bash
# If you have the Supabase CLI installed
supabase gen types typescript --local > types/database.types.ts
```

### 3. Test the System

Visit: `/artist/features/jobs`

You should see:
- ✅ Job categories loading
- ✅ Jobs page with filters
- ✅ Tabs for All Jobs, Saved, Applications
- ✅ Job search and filtering
- ✅ Beautiful job cards
- ✅ **NEW: Working "Post a Job" button**

### 4. Test Job Posting (Available Now!)

Click the **"Post a Job"** button to test the complete job posting system:

1. **Step 1**: Enter basic information (title, category, description)
2. **Step 2**: Set payment and location details
3. **Step 3**: Add requirements, skills, and benefits
4. **Step 4**: Review and publish

Your posted job will:
- ✅ Appear instantly in the jobs board
- ✅ Be searchable and filterable
- ✅ Display with all the information you provided
- ✅ Show with proper category icons and colors

## 🎯 Current Status

### ✅ What's Working Now (with mock data):
- Jobs page loads without errors
- Job categories display
- Filter components work
- Responsive design
- Tab navigation
- **✨ NEW: Complete job posting system**
- **✨ NEW: Multi-step job creation form**
- **✨ NEW: Form validation and error handling**
- **✨ NEW: Posted jobs appear instantly in the jobs board**
- **✨ NEW: Jobs are searchable and filterable**

### 🔄 What's Enabled After Migration:
- Real job creation and management
- Job applications system
- Save/bookmark functionality
- User authentication integration
- Search and filtering
- Analytics tracking

## 🔧 Features Overview

### **For Artists:**
- **Find Opportunities**: Browse opening slots, venue bookings, collaborations
- **Advanced Search**: Filter by location, payment type, genres, experience level
- **Save Jobs**: Bookmark interesting opportunities
- **Apply**: Submit applications with portfolio links
- **Track Applications**: Monitor application status
- **✨ Post Jobs**: Create opportunities for other artists (collaborations, session work, etc.)

### **For Venues/Organizers:**
- **Post Jobs**: Create comprehensive job listings for artists
- **Multi-Step Form**: Guided job creation with validation
- **Rich Job Details**: Include requirements, benefits, location, timing
- **Instant Publishing**: Jobs appear immediately in the jobs board
- **Manage Applications**: Review and respond to applicants
- **Analytics**: Track views, applications, and engagement

### **🆕 Job Posting Features:**
- **4-Step Process**: Basic Info → Job Details → Requirements → Review
- **Comprehensive Fields**: All necessary information for any music industry position
- **Smart Validation**: Real-time validation with helpful error messages
- **Dynamic Categories**: Support for all types of music industry jobs
- **Skills & Equipment**: Tag-based system for requirements
- **Benefits & Perks**: Highlight what makes the opportunity attractive
- **Location Flexibility**: In-person, remote, or hybrid options
- **Payment Options**: Paid, unpaid, revenue share, or exposure
- **Priority & Featured**: Boost visibility of important opportunities

### **Job Categories:**
- 🎵 **Opening Slots** - Opening act opportunities
- 🏢 **Venue Bookings** - Direct venue opportunities
- 👥 **Collaborations** - Artist partnerships
- 🎙️ **Session Work** - Studio session opportunities
- ⚙️ **Production** - Music production gigs
- 🚚 **Touring** - Tour musician opportunities
- 📅 **Festivals** - Festival performances
- 📚 **Teaching** - Music education opportunities
- ⭐ **Events** - Private and corporate events
- 💻 **Online** - Virtual performances

## 🛠️ Technical Details

### Database Schema:
- **PostgreSQL** with full-text search
- **Row Level Security** for data protection
- **Indexes** for fast queries
- **Triggers** for automatic counts
- **UUID** primary keys

### API Endpoints:
- `GET /api/artist-jobs` - Search and list jobs
- `POST /api/artist-jobs` - Create new jobs
- `GET /api/artist-jobs/categories` - Get job categories
- `GET /api/artist-jobs/saved` - Get saved jobs
- `POST /api/artist-jobs/saved` - Save/unsave jobs
- `GET /api/artist-jobs/[id]` - Get specific job
- `POST /api/artist-jobs/[id]/applications` - Apply to job

### Components:
- `JobCard` - Job listing display
- `JobFilters` - Advanced search filters
- `JobsPage` - Main jobs interface

## 🎨 UI Features

- **Dark Theme** optimized design
- **Responsive** mobile-first layout
- **Real-time Search** with filters
- **Tab Navigation** for different views
- **Loading States** and error handling
- **Accessible** keyboard navigation

## 📋 Next Steps

1. **Run the migration** to enable full functionality
2. **Test job creation** by clicking "Post a Job"
3. **Customize categories** if needed
4. **Add authentication** checks as needed
5. **Configure notifications** for new jobs

## 🚨 Troubleshooting

**Error: "SyntaxError: Unexpected token '<'"**
- This means the database tables don't exist yet
- Run the database migration first

**Error: "Select.Item must have a value prop"**
- This has been fixed in the latest version
- Refresh the page after migration

**Empty job listings:**
- Normal until you run the migration
- Mock data is shown by default

## 💡 Tips

- Use the **featured jobs** section for promoted opportunities
- **Save jobs** to review later
- **Filter by payment type** to find paid gigs
- **Search by location** for local opportunities
- **Filter by experience level** to match your skills
- **✨ NEW: Post comprehensive job listings** with all details artists need
- **✨ NEW: Use the multi-step form** for guided job creation
- **✨ NEW: Preview your job** before publishing

## 🎯 Job Posting Best Practices

1. **Write Clear Titles**: Be specific about the role and opportunity
2. **Detailed Descriptions**: Include all relevant information about the gig
3. **Set Fair Payment**: Be transparent about compensation
4. **Specify Requirements**: List necessary skills and equipment
5. **Add Benefits**: Highlight what makes your opportunity attractive
6. **Include Contact Info**: Make it easy for artists to reach you
7. **Set Realistic Deadlines**: Give artists enough time to apply

---

🎉 **The artist jobs ecosystem is ready!** This provides a comprehensive platform for artists to find opportunities and for venues/organizers to find talent. The job posting system is now fully functional and ready to use! 