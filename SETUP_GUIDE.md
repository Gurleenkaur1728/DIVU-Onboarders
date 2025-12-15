# 🚀 DIVU Onboarding Platform - Setup Guide

## ✅ Recent Updates (December 2025)

**All backend services have been consolidated into a single server!**

### What Changed:
- ✅ **Single Backend Server** - All APIs now run on port 4000
- ✅ **Unified API Endpoints** - No more managing multiple servers
- ✅ **Vite Proxy Configured** - Frontend uses relative `/api` paths
- ✅ **Chatbot Integrated** - RAG-based chatbot using knowledge base
- ✅ **AI Features** - Summary generation & quiz creation included

---

## 📦 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL (via Supabase)
- OpenAI API Key (for AI features)
- Groq API Key (for chatbot embeddings)
- Mailjet API Keys (for email notifications)

---

## 🔧 Installation

### 1. Install Root Dependencies
```bash
npm install
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 3. Environment Variables

Create a `.env` file in the **root directory**:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_DB_URL=your_postgres_connection_string

# OpenAI Configuration (for AI summaries and quiz generation)
OPENAI_API_KEY=your_openai_api_key

# Groq Configuration (for chatbot embeddings)
GROQ_API_KEY=your_groq_api_key

# Mailjet Configuration (for email reminders)
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
FROM_EMAIL=noreply@yourdomain.com
```

---

## 🎯 Running the Application

### Option 1: Run Everything Together (Recommended)
```bash
npm run dev:all
```
This starts:
- ✅ Vite dev server (Frontend) on port 5173
- ✅ Backend API server on port 4000

### Option 2: Run Separately

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
npm run backend
```

---

## 🌐 API Endpoints

All endpoints are available at `http://localhost:4000` or via `/api` in development:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reminders/sendNow` | POST | Send checklist reminders |
| `/api/ai/summary` | POST | Generate AI HR summary |
| `/api/ai/generate-quiz` | POST | Generate AI quiz questions |
| `/api/chat` | POST | Chatbot conversation |

---

## 📝 Frontend API Calls

All frontend API calls now use **relative paths** that are proxied to the backend:

```javascript
// ✅ Correct - Uses Vite proxy
fetch('/api/ai/summary', { ... })

// ❌ Old way - No longer needed
fetch('http://localhost:5050/api/ai/summary', { ... })
```

---

## 🤖 Chatbot Setup (Optional)

The chatbot uses a RAG (Retrieval-Augmented Generation) approach with your knowledge base.

### Generate Embeddings:
```bash
cd backend
node embedder.js
```

This creates `vectorstore.json` from files in `backend/knowledge/`.

---

## 📁 Project Structure

```
DIVU-Onboarders/
├── app/                    # Frontend components & pages
├── backend/                # Unified backend server
│   ├── server.js          # Main server (port 4000)
│   ├── routes/            # API routes
│   ├── knowledge/         # Chatbot knowledge base
│   └── vectorstore.json   # Embeddings for chatbot
├── src/                   # Core React files
├── vite.config.js         # Vite config with API proxy
└── package.json           # Root dependencies & scripts
```

---

## 🐛 Troubleshooting

### Backend Not Starting
```bash
# Check if backend dependencies are installed
cd backend
npm install
```

### API Calls Failing
1. Ensure backend is running on port 4000
2. Check `.env` file has all required keys
3. Verify Vite proxy is configured in `vite.config.js`

### Chatbot Not Working
1. Generate embeddings: `cd backend && node embedder.js`
2. Ensure `GROQ_API_KEY` is set in `.env`
3. Check that `vectorstore.json` exists in backend folder

---

## 🚢 Deployment

### Backend
Deploy `backend/` folder to your hosting service (Render, Railway, etc.)

**Environment Variables Required:**
- All `.env` variables listed above
- Set `PORT=4000` or use hosting provider's PORT variable

### Frontend
```bash
npm run build
```

Update API calls to point to your production backend URL or configure proxy.

---

## 📚 Additional Notes

### Old Files (Can be removed)
- `app/api/ai/summary.js` - Functionality moved to `backend/server.js`

### Migration Benefits
- ✅ Single server to manage
- ✅ Easier deployment
- ✅ Better performance
- ✅ Simplified development workflow
- ✅ No CORS issues

---

## 🆘 Support

If you encounter issues:
1. Check all environment variables are set
2. Ensure both frontend and backend are running
3. Verify database connection to Supabase
4. Check console logs for detailed error messages

---

**Happy Coding! 🎉**
