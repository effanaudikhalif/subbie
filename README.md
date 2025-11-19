# Subbie 🏠

A full-stack student sublet rental platform connecting students with sublet opportunities near their universities.

**Live Demo:** [subly-chi.vercel.app](https://subly-chi.vercel.app)

## ✨ Features

- 🔍 **Smart Search & Filtering** - Search by location, date range, and guest count with interactive map filtering
- 🗺️ **Interactive Maps** - Google Maps integration with real-time location filtering and commute time calculations
- 💬 **Real-time Messaging** - Built-in messaging system for hosts and renters
- 💳 **Payment Processing** - Secure payment handling with Stripe integration
- ⭐ **Review System** - Host and renter reviews with ratings
- 📧 **Email Notifications** - Automated email notifications for listings, messages, and bookings
- 🤖 **AI-Powered Suggestions** - OpenAI integration for listing title and description suggestions
- 📱 **Responsive Design** - Mobile-first design with optimized layouts for all devices
- 🔐 **Authentication** - Secure user authentication via Supabase Auth

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.3.4** with React 19
- **TypeScript** for type safety
- **Tailwind CSS 4** for styling
- **Supabase** for authentication and real-time features
- **Google Maps API** for maps and geocoding
- **Stripe.js** for payment processing

### Backend
- **Node.js** with **Express.js 5.1.0**
- **PostgreSQL** database (via Supabase/Railway)
- **Sharp** for image processing
- **node-cron** for scheduled tasks (listing expiration)
- **Multer** for file uploads

### Email Service
- **Python/FastAPI** for email notifications
- **SMTP/SendGrid** integration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (or Supabase account)
- Python 3.8+ (optional, for email service)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/effanaudikhalif/subbie.git
   cd subbie
   ```

2. **Install dependencies**
   ```bash
   # Root dependencies
   npm install
   
   # Backend dependencies
   cd backend && npm install && cd ..
   
   # Frontend dependencies
   cd frontend && npm install && cd ..
   ```

3. **Set up environment variables**
   
   Create `backend/.env`:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   FRONTEND_URL=http://localhost:3000
   PORT=4000
   ```
   
   Create `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

4. **Set up the database**
   - Create a Supabase project or set up PostgreSQL
   - Run the SQL schema from `backend/schema_railway_updated.sql`

5. **Run the application**
   ```bash
   # Terminal 1: Start backend (port 4000)
   cd backend && npm run dev
   
   # Terminal 2: Start frontend (port 3000)
   cd frontend && npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

For detailed setup instructions, see [SETUP.md](./SETUP.md).

## 📁 Project Structure

```
subbie/
├── backend/                 # Node.js/Express API server
│   ├── routes/             # API route handlers
│   ├── python-email-service/  # Python email notification service
│   ├── uploads/            # User-uploaded images
│   └── index.js            # Main server file
├── frontend/               # Next.js React application
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
├── supabase/              # Supabase configuration
└── docs/                  # Additional documentation
```

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Detailed setup and installation guide
- **[PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)** - System architecture and tech stack details
- **[BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md)** - Booking system documentation
- **[EMAIL_NOTIFICATIONS.md](./EMAIL_NOTIFICATIONS.md)** - Email notification setup
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Testing instructions

## 🌐 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set **Root Directory** to `frontend/`
3. Configure environment variables in Vercel dashboard
4. Deploy!

### Backend
Deploy to Railway, Render, or any Node.js hosting service. See deployment documentation for details.

## 🔑 Environment Variables

### Backend (`.env`)
- `DATABASE_URL` - PostgreSQL connection string (required)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)
- `PORT` - Server port (default: 4000)
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `GOOGLE_MAPS_API_KEY` - Google Maps API key (optional)
- `STRIPE_SECRET_KEY` - Stripe secret key (optional)

### Frontend (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (required)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (required)
- `NEXT_PUBLIC_API_URL` - Backend API URL (required)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key (optional)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (optional)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is private and proprietary.

## 👤 Author

**Effan Audi Khalif**
- GitHub: [@effanaudikhalif](https://github.com/effanaudikhalif)

## 🙏 Acknowledgments

- Built with Next.js, React, and Express
- Database powered by Supabase/PostgreSQL
- Maps powered by Google Maps API
- Payments powered by Stripe

---

**Note:** This is a student project for connecting students with sublet rental opportunities.
