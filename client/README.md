# WhatsApp CRM - React Frontend

Beautiful React frontend for the WhatsApp Business Platform with AI insights.

## 🎨 Features

✅ **Modern UI** - Clean, professional interface matching WhatsApp design
✅ **Three-Panel Layout** - Chat list, messages, and AI insights
✅ **AI Insights Dashboard** - Sentiment analysis, suggestions, and conversation summaries
✅ **Real-time Messaging** - Send and receive WhatsApp messages
✅ **Contact Management** - Browse and select conversations
✅ **Responsive Design** - Works on desktop and mobile

## 🚀 Quick Start

### Prerequisites
- Node.js installed
- Backend server running on port 3000

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will start on: **http://localhost:5173**

## 🔑 Login

Default credentials (pre-filled):
- **Email**: test@example.com
- **Password**: Test1234

## 📋 Components

- **App.jsx** - Main container with state management
- **Login.jsx** - Authentication page
- **ChatList.jsx** - Left sidebar with contacts
- **ChatWindow.jsx** - Center panel with messages
- **AIInsights.jsx** - Right panel with AI features
- **ChatItem.jsx** - Individual chat in the list
- **Message.jsx** - Message bubble component
- **SentimentGauge.jsx** - SVG sentiment visualization

## 🎨 Design Features

- **Gradient Backgrounds** - Beautiful purple gradient
- **WhatsApp-style Messages** - Blue sent, gray received bubbles
- **AI-Enhanced Mode Toggle** - Enable/disable AI features
- **Sentiment Analysis** - Visual gauge showing conversation mood
- **Smart Suggestions** - Context-aware action buttons
- **Conversation Summary** - AI-generated context

## 🔧 Technology Stack

- **React** - UI library
- **Vite** - Build tool
- **React Icons** - Icon library
- **Axios** - HTTP client
- **Socket.io-client** - Real-time communication

## 📱 Usage

1. **Login** - Enter credentials to access the CRM
2. **Select Chat** - Click a contact from the left panel
3. **Send Messages** - Type and send WhatsApp messages
4. **View Insights** - Check sentiment and AI suggestions on the right
5. **Toggle AI** - Enable AI-Enhanced Mode for full features

## 🌐 API Integration

Frontend connects to backend API at `http://localhost:3000/api`

Endpoints used:
- `POST /api/auth/login` - Authentication
- `GET /api/contacts` - Fetch contacts
- `GET /api/messages/:phone` - Get conversation history
- `POST /api/messages/send` - Send message

## 📦 Build for Production

```bash
npm run build
```

Built files will be in the `dist/` folder.

## 🎯 Features Showcase

### Chat List (Left Panel)
- Three tabs: CHAT, GROUP, ARCHIVED
- AI-Enhanced Mode toggle
- Search functionality
- Contact avatars and status
- Unread message count

### Chat Window (Center)
- Contact header with phone number
- WhatsApp-style message bubbles
- Message input with emoji button
- Send button
- Timestamp on each message
- Background pattern like WhatsApp

### AI Insights (Right Panel)
- **Sentiment Gauge**: Visual indicator of conversation mood
- **Suggestions**: Context-aware action buttons
- **Summary**: AI-generated conversation overview

## 🎨 Color Scheme

- **Primary Blue**: #4A9FF5 (Message bubbles, buttons)
- **Gradient**: Linear gradient from #667eea to #764ba2
- **Background**: #f8f9fa
- **Text**: #1f2937 (Dark), #6b7280 (Medium)

---

**Built with ❤️ using React + Vite**
