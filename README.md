# Prudence AI - The Collective Mind

A modern AI chat interface that allows users to interact with multiple AI models simultaneously using ensemble mode.

## Features

- **Ensemble Mode**: Get responses from multiple AI models (GPT-4, Claude, Gemini) simultaneously
- **Firebase Integration**: Secure authentication and real-time chat history storage
- **Personality Development FAQs**: 100+ pre-loaded FAQs for personality development topics
- **Web Development FAQs**: Comprehensive web development knowledge base
- **Real-time Chat History**: Save and load conversations with Firebase
- **Responsive Design**: Modern UI that works on desktop and mobile
- **Theme Toggle**: Light/dark mode support

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Realtime Database)
- **AI Models**: GPT-4, Claude, Gemini, Perplexity, Copilot, Bard, LLaMA
- **Architecture**: Modular JavaScript with ES6 modules

## Project Structure

```
Prudence Ai/
├── index.html          # Main HTML file
├── style.css           # Main stylesheet
├── js/
│   ├── script.js       # Main application logic
│   ├── firebase.js     # Firebase configuration
│   ├── auth.js         # Authentication functions
│   ├── faq.js          # FAQ management
│   ├── aiModels.js     # AI model configurations
│   └── theme.js        # Theme management
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## 🚀 Quick Start

### **For Viewing (No Setup Required)**
- **Live Demo**: Visit the GitHub Pages link (available after repository setup)
- **Local View**: Simply open `index.html` in any web browser
- **Note**: Firebase features require proper configuration

### **For Full Functionality (Requires Setup)**
1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Prudence-Ai
   ```

2. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Enable Realtime Database
   - Update the Firebase configuration in `js/firebase.js` with your actual Firebase values:
     ```javascript
     const firebaseConfig = {
       apiKey: "YOUR_ACTUAL_API_KEY",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_SENDER_ID",
       appId: "YOUR_APP_ID"
     };
     ```

3. **Run the Application**
   - Open `index.html` in a web browser
   - Or use a local server: `python -m http.server 8000`

## 📋 Features Overview

### **UI/UX Features (Always Available)**
- ✅ **Complete interface demonstration**
- ✅ **AI model selection interface**
- ✅ **Theme switching (light/dark mode)**
- ✅ **Responsive design**
- ✅ **Chat interface layout**
- ✅ **FAQ system (local data)**
- ✅ **Ensemble mode interface**

### **Firebase Features (Requires Setup)**
- 🔥 **User authentication (login/signup)**
- 🔥 **Chat history saving**
- 🔥 **Real-time data synchronization**
- 🔥 **FAQ data persistence**
- 🔥 **Multi-user support**

## Features in Detail

### Ensemble Mode
- Always enabled by default
- Supports up to 3 AI models simultaneously
- Real-time response comparison
- All responses saved to chat history

### FAQ System
- 100+ personality development questions
- Web development knowledge base
- Smart matching algorithm
- Automatic Firebase synchronization

### Chat History
- Firebase Realtime Database storage
- Automatic chat saving
- Chat history sidebar
- Delete individual chats

### Authentication
- Email/password authentication
- Secure Firebase integration
- User-specific chat history
- Automatic login state management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the GitHub repository.
