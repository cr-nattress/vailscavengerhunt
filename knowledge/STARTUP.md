# 🚀 Vail Scavenger Hunt - Startup Guide

## Available Startup Commands

### **🎯 Recommended Commands**

#### `npm start`
**Runs UI + Cloudinary API** (Most common setup)
- **UI**: React app on http://localhost:5173
- **API**: Cloudinary collage server on http://localhost:3001
- **Uses**: Color-coded output with prefixes [UI] and [API]

#### `npm run start:full`
**Runs UI + Cloudinary API + State Server** (Full local development)
- **UI**: React app on http://localhost:5173
- **API**: Cloudinary collage server on http://localhost:3001
- **STATE**: Simple state management server on http://localhost:3002
- **Uses**: Color-coded output with prefixes [UI], [API], and [STATE]

#### `npm run start:netlify`
**Runs UI + Netlify Functions** (Production-like environment)
- **UI**: React app with Netlify Functions simulation
- **Functions**: Netlify Blobs state management
- **Uses**: Netlify CLI for local development

---

### **🔧 Individual Commands**

#### Frontend (UI)
```bash
npm run dev          # Start React UI only
npm run build        # Build for production
npm run preview      # Preview production build
```

#### Backend APIs
```bash
npm run server:dev           # Cloudinary API server (hot reload)
npm run state-server:dev     # Simple state server (hot reload)
```

---

### **🌍 Environment Setup**

#### Development (Local)
```bash
npm start              # UI + Cloudinary API
# or
npm run start:full     # UI + Both APIs
```

#### Production (Netlify)
```bash
npm run start:netlify  # Test Netlify Functions locally
npm run build         # Build for deployment
```

---

### **📋 Quick Start Checklist**

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Add your Cloudinary credentials

3. **Start development**
   ```bash
   npm start
   ```

4. **Open in browser**
   - UI: http://localhost:5173
   - API Health: http://localhost:3001/health

---

### **🎨 Color-Coded Output**

When using `npm start` or `npm run start:full`, you'll see:
- **🔵 [UI]** - Cyan colored logs from React/Vite
- **🟣 [API]** - Magenta colored logs from Cloudinary server  
- **🟡 [STATE]** - Yellow colored logs from state server

---

### **⚡ Quick Commands Reference**

```bash
# Most common - UI + main API
npm start

# Full development - all services
npm run start:full

# Test Netlify deployment locally
npm run start:netlify

# Just the UI
npm run dev

# Build for production
npm run build
```

---

### **🔧 Troubleshooting**

#### Port conflicts?
- UI runs on port 5173 (Vite default)
- Cloudinary API runs on port 3001
- State server runs on port 3002

#### Environment variables not loading?
- Check `.env` file exists in project root
- Restart the servers after changing `.env`

#### Netlify Functions not working locally?
- Install Netlify CLI: `npm install -g netlify-cli`
- Use `npm run start:netlify` instead

---

### **📦 What Each Server Does**

| Server | Port | Purpose | Required For |
|--------|------|---------|--------------|
| **UI** | 5173 | React frontend | Always |
| **Cloudinary API** | 3001 | Image collage creation | Prize generation |
| **State Server** | 3002 | Simple key-value storage | Development testing |
| **Netlify Functions** | Various | Production state storage | Deployed app |

Choose the setup that matches your development needs! 🎉