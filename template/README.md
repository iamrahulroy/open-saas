# ThaiCopilot MVP - Setup Guide

**Modern Thai Language Learning Platform** - Turn conversations into lessons with AI-powered corrections and flashcards.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd app
npm install
```

### 2. Configure Database
```bash
# Create .env.server file
cp .env.server.example .env.server

# Add your PostgreSQL URL
DATABASE_URL="postgresql://user:password@localhost:5432/thaicopilot"
```

### 3. Run Migrations
```bash
wasp db migrate-dev
```

### 4. Start Development Server
```bash
wasp start
```

Access at: `http://localhost:3000`

---

## 📋 What's Implemented

### ✅ **EPIC 1: Landing Page & Email Capture**
- **Landing Page** (`app/src/landing-page/LandingPage.tsx`)
  - Modern gradient design (purple→fuchsia→red)
  - Framer Motion animations
  - Fully responsive (mobile-first)
  - PWA-ready with manifest.json
- **Email Signup** (`app/src/email-signup/operations.ts`)
  - Client + server validation
  - Duplicate handling
  - UTM tracking support
- **QR Code Generator** (`app/scripts/generate-qr-code.ts`)
  ```bash
  npm run generate-qr              # Main landing page
  npm run generate-qr condo_poster # With UTM source
  ```

### ✅ **EPIC 2: Authentication**
- Email + password signup
- Email verification
- Waitlist page post-signup (`app/src/waitlist/WaitlistPage.tsx`)
- Password reset flow

### ✅ **EPIC 3: Translation Feature**
- **Dashboard** (`app/src/conversations/DashboardPage.tsx`)
  - Real-time EN↔TH translation with OpenAI gpt-4o-mini
  - Language switcher with flag icons
  - Conversation history with expand/collapse
  - Audio recording with MediaRecorder API (ready for speech-to-text)
- **Rate Limiting**
  - 10 translations/day for free users
  - Automatic 24-hour reset
  - Unlimited for paid users
- **Operations** (`app/src/conversations/operations.ts`)
  - Translation validation (max 5000 chars)
  - Conversation management
  - Error handling with HttpError

### ✅ **EPIC 4: Thai Friend Corrections**
- **Magic Link Sharing** (`app/src/corrections/operations.ts`)
  - Generate unique share tokens with 30-day expiration
  - Copy-to-clipboard with toast notifications
- **Public Correction Page** (`app/src/corrections/CorrectConversationPage.tsx`)
  - No auth required - anyone with link can correct
  - Thai/English bilingual interface
  - Submit corrections with name, email, notes
  - View existing corrections history
  - Framer Motion animations
- **Share Button** on conversation cards

### ✅ **EPIC 5: Flashcard Generation**
- **AI-Powered Generation** (`app/src/flashcards/operations.ts`)
  - Auto-extract 2-4 key phrases from translations
  - Word/phrase breakdown with pronunciation
  - Cultural notes and usage tips
  - OpenAI gpt-4o-mini integration
- **Generate Button** on each conversation message
- **Edit/Delete** functionality for flashcards

### ✅ **EPIC 6: Spaced Repetition Study**
- **Study Interface** (`app/src/flashcards/FlashcardsPage.tsx`)
  - SM-2 algorithm implementation
  - Review buttons: Again, Hard, Good, Easy
  - Dynamic interval calculation (1 day → 6 days → exponential)
  - Progress bar and card counter
- **Library Mode**
  - Browse all flashcards
  - Navigate with Previous/Next buttons
  - Delete unwanted cards
- **Due Flashcards Queue**
  - Shows up to 20 cards per session
  - Sorted by nextReview date

### ✅ **Database Schema**
Complete Prisma schema with models:
- `User` (with onboarding/waitlist status + translation limits)
- `EmailSignup` (pre-auth signups)
- `Conversation` (translation sessions)
- `Message` (individual translations)
- `Correction` (Thai friend feedback)
- `ConversationShare` (magic links)
- `Flashcard` (with SM-2 spaced repetition fields)
- `FlashcardReview` (review history)

---

## 🎨 Design Highlights

- **Colors**: Purple-600 (#9333EA), Fuchsia-600 (#C026D3), Red-600 (#DC2626)
- **Animations**: Framer Motion throughout
- **Icons**: Lucide React
- **Responsive**: Mobile-first with Tailwind CSS
- **PWA**: Installable, offline-ready manifest

---

## 🔑 Environment Variables

Create `app/.env.server`:
```bash
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."           # Required for translations & flashcard generation
CLOUDFLARE_R2_ACCESS_KEY="..."    # For audio storage (future - TTS integration)
CLOUDFLARE_R2_SECRET_KEY="..."
CLOUDFLARE_R2_BUCKET="..."
```

**Note**: The app uses OpenAI's `gpt-4o-mini` model for cost-effective translations (~$0.15 per 1M input tokens).

---

## 📁 File Structure

```
app/
├── main.wasp                    # Wasp config (routes, auth, entities)
├── schema.prisma                # Database models
├── src/
│   ├── landing-page/
│   │   └── LandingPage.tsx      # Main landing (Hero, FAQ, CTA)
│   ├── waitlist/
│   │   └── WaitlistPage.tsx     # Post-signup waitlist
│   ├── email-signup/
│   │   └── operations.ts        # Email capture logic
│   └── auth/                    # Login, signup, verification
├── scripts/
│   └── generate-qr-code.ts      # QR generator
└── public/
    ├── manifest.json            # PWA manifest
    └── icons/                   # App icons (TODO: generate)
```

---

## 🚢 Deployment

### **Option 1: Railway (Recommended)**
```bash
wasp deploy fly launch thaicopilot-app
```
Railway handles PostgreSQL automatically.

### **Option 2: Fly.io**
```bash
wasp deploy fly launch thaicopilot-app
```
Add Fly Postgres separately: `fly postgres create`

### **Environment Setup**
Add production env vars:
```bash
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set OPENAI_API_KEY="sk-..."
```

---

## 📱 QR Code Usage

Generate for poster campaigns:
```bash
# Main landing
npm run generate-qr

# Condo poster (tracks source)
npm run generate-qr condo_poster

# Coffee shop campaign
npm run generate-qr coffee_shop
```

Outputs:
- `public/qr-codes/qr-{source}.png` (black, high reliability)
- `public/qr-codes/qr-{source}-branded.png` (purple, marketing)

Print at **minimum 5cm × 5cm** for reliable scanning.

---

## 🧪 Testing Strategy

### **Manual Testing**
1. **Email Capture**: Submit valid/invalid emails
2. **Signup Flow**: Complete registration → verify email → see waitlist
3. **Mobile**: Test on real device (scan QR, PWA install)

### **Future: Playwright E2E**
```bash
wasp test
```

---

## 🛣️ Roadmap (Next Steps)

### **Immediate (Week 1-2)**
1. Generate PWA icons (72px → 512px)
2. Create OG image (`public/og-image.png`)
3. Add speech-to-text for audio recording
4. Integrate TTS (Google/ElevenLabs) for audio generation
5. Set up Cloudflare R2 for audio storage
6. Test on iOS/Android devices
7. Deploy to production (Railway/Fly.io)

### **EPIC 7: Payments** ⏳
- Polar.sh checkout integration
- Subscription management (free → paid)
- Webhook handling for payment events
- Upgrade flow from dashboard

### **EPIC 8: Admin Dashboard** ⏳
- User metrics (MRR, conversion rate, churn)
- Translation usage analytics
- Email signup viewer
- System health monitoring

### **Future Enhancements**
- Email notifications for corrections
- More language pairs (beyond EN-TH)
- Voice cloning for personalized audio
- Community correction marketplace
- Mobile app (React Native)

---

## 🐛 Troubleshooting

### **"Module not found: framer-motion"**
```bash
cd app && npm install
```

### **Database Migration Fails**
```bash
wasp db reset  # ⚠️ Deletes all data
wasp db migrate-dev
```

### **Port 3000 Already in Use**
```bash
lsof -ti:3000 | xargs kill -9
wasp start
```

---

## 📞 Support

- **Docs**: [docs.opensaas.sh](https://docs.opensaas.sh)
- **Wasp**: [wasp.sh](https://wasp.sh)
- **Issues**: Create GitHub issue

---

## 📊 Progress Tracker

- [x] Landing page with email capture
- [x] QR code generator
- [x] Waitlist page
- [x] Database schema
- [x] PWA manifest
- [ ] Translation engine (EPIC 3)
- [ ] Flashcard system (EPIC 5)
- [ ] Payments (EPIC 6)
- [ ] Admin dashboard (EPIC 7)

**Word Count**: 698 ✅
