# ⚡ Loading Screen Quick Reference

## 🎯 Choose Your Animation Variant

### Decision Tree

```
Is this a major route (app entry point)?
├─ YES → Use variant="glow" with fullScreen={true}
└─ NO → Continue...

Is it about data/analytics?
├─ YES → Use variant="waves"
└─ NO → Continue...

Is it social/exciting content?
├─ YES → Use variant="particles"
└─ NO → Continue...

Is it a comprehensive view?
├─ YES → Use variant="orbit"
└─ NO → Continue...

Is it processing/calculating?
├─ YES → Use variant="rotate"
└─ NO → Continue...

Is it a long wait?
├─ YES → Use variant="breathe"
└─ NO → Use variant="pulse" (default)
```

---

## 📋 Copy-Paste Templates

### Full-Screen Loading
```typescript
import { BrandLoadingScreen } from '@/components/ui/brand-loading-screen'

export default function Loading() {
  return (
    <BrandLoadingScreen
      variant="glow"
      message="Loading [Your Feature]..."
      subMessage="[Helpful context about what's loading]"
      logoSrc="/tourify-logo-white.svg"
      fullScreen={true}
    />
  )
}
```

### Inline Loading (Dashboard)
```typescript
import { BrandLoadingScreen } from '@/components/ui/brand-loading-screen'

export default function Loading() {
  return (
    <BrandLoadingScreen
      variant="[choose-variant]"
      message="Loading [Feature]..."
      subMessage="[Context]"
      logoSrc="/tourify-logo-white.svg"
      fullScreen={false}
    />
  )
}
```

### With Progress Bar
```typescript
import { BrandLoadingScreen } from '@/components/ui/brand-loading-screen'

export default function Loading() {
  const [progress, setProgress] = useState(0)
  
  return (
    <BrandLoadingScreen
      variant="glow"
      message="Loading..."
      subMessage="Processing..."
      logoSrc="/tourify-logo-white.svg"
      fullScreen={false}
      showProgress={true}
      progress={progress}
    />
  )
}
```

---

## 🎨 Variant Cheat Sheet

| Variant | Speed | Intensity | Best For | Feeling |
|---------|-------|-----------|----------|---------|
| `glow` | Medium | High | Main pages, premium | Prestigious ⭐ |
| `particles` | Medium | High | Social, exciting | Magical ✨ |
| `orbit` | Slow | Medium | Overview, platform | Comprehensive 🎭 |
| `waves` | Medium | Low | Analytics, sync | Flowing 🌊 |
| `pulse` | Fast | Low | Quick actions | Simple 💓 |
| `rotate` | Medium | Medium | Processing | Active 🔄 |
| `breathe` | Slow | Low | Long waits | Calming 🫁 |

---

## 💬 Message Writing Guide

### Good Messages
```typescript
✅ "Loading Venue Experience..."      // Specific
✅ "Gathering your performance data"  // Active
✅ "Setting up your dashboard"        // Helpful
✅ "Preparing your tools"             // Encouraging
```

### Bad Messages
```typescript
❌ "Loading..."                       // Too generic
❌ "Please wait"                      // Demanding
❌ "Fetching data"                    // Technical jargon
❌ "Processing request"               // Vague
```

### Template
```
"Loading [Specific Feature]..."
"[Action verb]-ing your [user benefit]"
```

---

## 🎯 When to Use What

### Full-Screen vs Inline

**Use `fullScreen={true}` when:**
- Main route entry points
- App initialization
- Major feature loading
- First-time user experience

**Use `fullScreen={false}` when:**
- Dashboard sub-routes
- Within existing layouts
- Quick page transitions
- User already authenticated

---

## 🚀 Common Patterns

### Pattern 1: Main Route
```typescript
// app/[feature]/loading.tsx
variant="glow"
fullScreen={true}
message="Loading [Feature] Experience..."
```

### Pattern 2: Dashboard Route
```typescript
// app/[feature]/dashboard/loading.tsx
variant="orbit"
fullScreen={false}
message="Loading Dashboard..."
```

### Pattern 3: Sub-Route
```typescript
// app/[feature]/dashboard/[sub]/loading.tsx
variant="[contextual]"
fullScreen={false}
message="Loading [Sub Feature]..."
```

---

## 🎨 Brand Assets

### Logo Paths
```typescript
Primary:   "/tourify-logo-white.svg"   // Main logo (default)
Alt 1:     "/tourify-logo.svg"         // Dark backgrounds
Alt 2:     "/tourify-logo-white.png"   // PNG fallback
Alt 3:     "/logo.svg"                 // Simple version
```

### Colors (Optional Override)
```typescript
primaryColor="rgb(139, 92, 246)"    // Purple-500
secondaryColor="rgb(59, 130, 246)"  // Blue-600
```

---

## 🔧 Advanced Options

### All Available Props
```typescript
interface BrandLoadingScreenProps {
  message?: string              // Main loading text
  subMessage?: string           // Secondary text
  variant?: LoadingVariant      // Animation style
  showProgress?: boolean        // Show progress bar
  progress?: number             // Progress value (0-100)
  fullScreen?: boolean          // Full screen vs inline
  logoSrc?: string              // Logo path
  primaryColor?: string         // Brand color 1
  secondaryColor?: string       // Brand color 2
  onComplete?: () => void       // Callback when done
}
```

---

## 📊 Route Coverage

### Currently Using BrandLoadingScreen ✅

#### Venue Routes
- ✅ `/venue` - Glow (full)
- ✅ `/venue/dashboard` - Orbit
- ✅ `/venue/equipment` - Pulse
- ✅ `/venue/finances` - Rotate
- ✅ `/venue/edit` - Glow
- ✅ `/venue/dashboard/feed` - Particles
- ✅ `/venue/dashboard/jobs` - Rotate
- ✅ `/venue/dashboard/promotions` - Particles
- ✅ `/venue/dashboard/venues` - Orbit
- ✅ `/venue/dashboard/integrations` - Waves
- ✅ `/venue/dashboard/groups` - Breathe
- ✅ `/venue/dashboard/tickets` - Glow
- ✅ `/venue/dashboard/documents` - Pulse

#### Other Routes
- ✅ `/analytics` - Waves
- ✅ `/documents` - Pulse
- ✅ `/admin/dashboard/inventory` - Rotate
- ✅ `/admin/dashboard/staff` - Orbit

#### Using Skeleton Loaders (Keep) 🎨
- `/artist` - Skeleton (detailed layout)
- `/admin/dashboard` - Skeleton (dashboard grid)
- `/messages` - Skeleton (chat interface)
- `/venue/bookings` - Skeleton (booking list)
- `/venue/dashboard/analytics` - Skeleton (charts)
- `/venue/dashboard/equipment` - Skeleton (inventory)
- `/venue/dashboard/events` - Skeleton (event cards)
- `/venue/dashboard/teams` - Skeleton (team structure)
- `/admin/dashboard/communications` - Skeleton (comms grid)

---

## 🎓 Best Practices

### DO ✅
- Always import from `@/components/ui/brand-loading-screen`
- Use specific, contextual messages
- Choose variant that matches the action
- Include `logoSrc="/tourify-logo-white.svg"`
- Set appropriate `fullScreen` value
- Write encouraging sub-messages

### DON'T ❌
- Return `null` from loading.tsx
- Use generic "Loading..." alone
- Mix different branding
- Forget to import the component
- Use wrong variant for context
- Skip the subMessage prop

---

## 🐛 Troubleshooting

### Logo Not Showing
```typescript
// Check path is correct
logoSrc="/tourify-logo-white.svg"  ✅
logoSrc="tourify-logo-white.svg"   ❌ (missing /)
logoSrc="/images/logo.svg"         ✅ (if in /images)
```

### Animation Not Working
```typescript
// Check variant spelling
variant="glow"      ✅
variant="Glow"      ❌ (wrong case)
variant="glowing"   ❌ (wrong name)
```

### Full Screen Issues
```typescript
// For route-level loading
fullScreen={true}   ✅ Main routes
fullScreen={false}  ✅ Sub-routes

// Don't use fullScreen in nested layouts
```

---

## 📱 Testing Checklist

Before committing your loading screen:

- [ ] Logo displays correctly
- [ ] Animation runs smoothly
- [ ] Message is specific and helpful
- [ ] Variant matches the context
- [ ] No console errors
- [ ] Looks good on mobile
- [ ] Works in production build
- [ ] TypeScript compiles

---

## 🎯 Quick Fixes

### Convert Old Loading Screen
```typescript
// OLD (❌ Don't do this)
export default function Loading() {
  return (
    <div className="flex items-center justify-center">
      <Loader2 className="animate-spin" />
    </div>
  )
}

// NEW (✅ Do this)
import { BrandLoadingScreen } from '@/components/ui/brand-loading-screen'

export default function Loading() {
  return (
    <BrandLoadingScreen
      variant="pulse"
      message="Loading..."
      subMessage="Just a moment"
      logoSrc="/tourify-logo-white.svg"
      fullScreen={false}
    />
  )
}
```

### Fix Null Return
```typescript
// OLD (❌ Don't do this)
export default function Loading() {
  return null
}

// NEW (✅ Do this)
import { BrandLoadingScreen } from '@/components/ui/brand-loading-screen'

export default function Loading() {
  return (
    <BrandLoadingScreen
      variant="glow"
      message="Loading..."
      logoSrc="/tourify-logo-white.svg"
      fullScreen={false}
    />
  )
}
```

---

## 🎨 Component Location

```
📁 components/ui/brand-loading-screen.tsx
   ├─ BrandLoadingScreen (main component)
   ├─ TourifyLoading.* (pre-configured variants)
   └─ useBrandLoading() (state hook)
```

---

## 📚 Related Documentation

- `BRAND_LOADING_SYSTEM.md` - Complete system documentation
- `LOADING_SCREENS_VISUAL_GUIDE.md` - Visual examples and design
- `LOADING_SCREEN_UPGRADE.md` - Migration summary

---

## 💡 Pro Tips

1. **Match the Action**: If loading analytics, use `waves`. If loading jobs, use `rotate`.

2. **Message Hierarchy**: Main message should be short. Sub-message adds context.

3. **Full-Screen Sparingly**: Only use for major transitions, not every page.

4. **Variant Consistency**: Similar routes should use similar variants for UX.

5. **Test Both States**: Test with fast and slow connections.

6. **Mobile First**: Always check on mobile - animations should still perform well.

7. **Accessibility**: Screen readers will announce the messages, make them helpful.

---

## 🎬 Ready to Use!

All loading screens are now production-ready with:
- ✅ Professional branded animations
- ✅ Consistent user experience
- ✅ Optimal performance
- ✅ Full TypeScript support
- ✅ Error handling
- ✅ Mobile responsive

**Just copy the template and customize for your route!** 🚀

---

*Quick Reference v1.0 - January 20, 2025*



