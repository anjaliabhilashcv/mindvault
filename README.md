# 🧠 MindVault

### An AI-powered personal memory vault for journaling, reflection, and long-term growth.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-MindVault-blue?style=for-the-badge)](https://mindvault-memory-anjali.ai.studio/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github)](https://github.com/anjaliabhilashcv/mindvault)

---

## 🌱 About MindVault

MindVault is an AI-powered personal memory system that transforms everyday journaling into meaningful reflection.

Instead of treating journal entries as isolated pieces of text, MindVault uses Generative AI to understand personal experiences across time. It helps users explore their memories, identify recurring patterns, ask questions about their past, and understand how they grow.

> **Don't just remember what happened. Understand how you've changed.**

MindVault combines private journaling, multimodal AI, personal memory retrieval, and longitudinal growth intelligence into one secure platform.

---

## ✨ Features

### 📝 Private Journaling
- Create, edit, and delete journal memories
- Secure authentication
- User-level data isolation
- Persistent journal history

### 🧠 AI Memory Insights
- Mood analysis
- Emotion detection
- Key themes
- Important thoughts
- Significant events
- Growth signals
- Personalized reflection questions
- Automatic stale-analysis detection after edits

### 🎙️ Voice Reflections
- Record voice reflections
- Convert voice notes into written journal entries

### 📸 Multimodal Memories
- Attach images to journal entries
- Gemini understands images alongside written memories
- Private media storage

### 💬 Ask My Journal
Ask questions about your personal journal history and receive evidence-grounded answers based on your actual memories.

### 📈 Growth Intelligence
- Mood trends
- Recurring emotions
- Recurring themes
- Positive moments and wins
- Recurring challenges
- Growth signals
- Resolution patterns
- Long-term narrative insights

### 🔄 What Changed About Me?
Compare two periods of your life and explore:
- Mood shifts
- Emotional changes
- Theme trajectories
- Challenges and friction
- Growth signals
- Positive developments
- Supporting memories from both periods

### 📊 Personal Dashboard
- Total memories
- Monthly activity
- Media memories
- Recent memories
- Growth summaries
- Quick access to reflection tools

### 🌗 Light & Dark Mode
A responsive interface with persistent theme preferences.

### 📄 PDF Export
- Export individual memories
- Export your complete journal
- Include attached media where applicable
- Confirmation before export

---

## 🔐 Privacy & Security

Privacy is a core part of MindVault.

### Firebase Authentication

Users authenticate securely through Firebase Authentication.

### User-Level Data Isolation

Journal entries are stored under user-specific Firestore paths:

text
/users/{userId}/entries/{entryId}
Firestore security rules ensure that users can only access their own memories.

### Server-Side Authentication

Protected API requests use verified Firebase ID tokens. User identity is derived from the authenticated token rather than being trusted from client-provided values.

### Secure AI Processing

Journal entries are treated as untrusted data when provided to Gemini. The AI processing layer is designed to prevent journal content from being interpreted as system instructions or commands.

### Private Media

Images are stored using private Cloudinary assets and accessed through controlled server-side flows with ownership verification.

### Secrets

API credentials are kept server-side and are never intended to be exposed in the frontend or committed to the repository.

### Additional Protections
- Input validation
- Rate limiting
- Ownership verification
- Cross-user access protection
- Evidence-grounded AI responses
- Graceful AI failure handling
- No exposure of Firebase UIDs in the interface

## 🤖 How Gemini Powers MindVault

Gemini is used as more than a conversational chatbot.

It powers multiple parts of the MindVault experience:

                    Journal Memory
                          │
                          ▼
                  Gemini AI Analysis
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
       Emotions        Themes        Growth Signals
          │               │               │
          └───────────────┼───────────────┘
                          ▼
                  Personal Memory Layer
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
       Ask My Journal            Growth Intelligence
             │                         │
             ▼                         ▼
     Evidence-Grounded          Longitudinal
          Answers                Reflection
             │                         │
             └────────────┬────────────┘
                          ▼
                  "What Changed?"

### 🏗️ Architecture
                         ┌─────────────────────┐
                         │      MindVault      │
                         │     Web Client      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Firebase Auth       │
                         │ User Authentication │
                         └──────────┬──────────┘
                                    │
                              ID Token
                                    │
                                    ▼
                    ┌────────────────────────────┐
                    │      Node.js Backend       │
                    │     TypeScript / APIs      │
                    └──────────────┬─────────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
             ▼                     ▼                     ▼
      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
      │  Firestore  │      │   Gemini    │      │ Cloudinary  │
      │   Memories  │      │     AI      │      │    Media    │
      └─────────────┘      └─────────────┘      └─────────────┘
             │                     │                     │
             └─────────────────────┼─────────────────────┘
                                   ▼
                         ┌─────────────────────┐
                         │ Reflection & Growth │
                         │     Intelligence    │
                         └─────────────────────┘

### 🛠️ Tech Stack
Technology |	Purpose
- React	| Frontend interface
- TypeScript	| Frontend and backend development
- Node.js |	Backend runtime
- Google | Gemini	AI analysis, multimodal understanding and reflection
- Google AI Studio | Development environment
- Firebase Authentication |	Secure user authentication
- Cloud Firestore |	Persistent private journal storage
- Cloudinary |	Private image/media storage
- Google Cloud Run | Production deployment
- Vite	| Frontend development and build tooling
  
### ☁️ Google Cloud & Firebase Integration

MindVault uses Google's ecosystem throughout the application.

## Firebase Authentication

Provides secure user authentication and identity management.

## Firebase Firestore

Stores journal memories and AI-generated insights while enforcing user-level access isolation through Firestore Security Rules.

## Gemini

Provides:

- Individual journal analysis
- Multimodal image understanding
- Evidence-grounded journal Q&A
- Growth intelligence
- Longitudinal comparisons
- Reflection generation

## Google Cloud Run
Hosts the production application and server-side API layer.

### 🔄 Core User Flow
Sign In
   │
   ▼
Create Memory
   │
   ├───────────────┐
   │               │
   ▼               ▼
Text Entry      Voice Note
   │               │
   │               ▼
   │          Speech → Text
   │               │
   └───────┬───────┘
           ▼
      Journal Memory
           │
       ┌───┴────┐
       ▼        ▼
     Image     Text
       │        │
       └───┬────┘
           ▼
      Gemini Analysis
           │
           ▼
    Personal Memory Layer
           │
     ┌─────┼──────────┐
     ▼     ▼          ▼
    Ask   Growth   What Changed?
   Journal Insights

## ⚙️ Running Locally
Prerequisites:
- Node.js
- npm
- Firebase project
- Gemini API access
- Cloudinary account

## Installation

Clone the repository:

git clone https://github.com/anjaliabhilashcv/mindvault.git
cd mindvault

Install dependencies:

npm install

Start the development server:

npm run dev

## 🔑 Environment Variables

Secrets should never be committed to GitHub.

Configure the required server-side environment variables using the project's environment/secrets configuration.

Example variables include:

GEMINI_API_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

See .env.example for the expected configuration structure.

⚠️ Never commit real API keys, API secrets, passwords, service-account credentials, or other private credentials to the repository.

## 📁 Project Structure
mindvault/
│
├── public/
│
├── src/
│   ├── components/
│   ├── views/
│   └── server/
│
├── firestore.rules
├── server.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
└── README.md
## 💡 Why MindVault?

Traditional journaling helps people record their experiences.

MindVault is designed to help people understand them.

A journal contains years of thoughts, emotions, goals, challenges, and experiences, but finding patterns across that history can be difficult.

MindVault turns those memories into an interactive personal context layer where users can:

Look back
Ask questions
Discover patterns
Reflect on challenges
Recognize growth
Understand how their experiences have changed over time

The focus is not simply on generating AI responses.

It is on making those responses personal, grounded, and connected to the user's own memories.

## 🔮 Future Possibilities

Potential future directions include:

Richer multimodal memories
Advanced semantic retrieval
Timeline-based memory exploration
More personalized reflection journeys
Intelligent memory organization
Additional privacy-preserving AI capabilities

## 👩‍💻 Built By

Anjali Abhilash

Built with Google Gemini, Firebase, Google Cloud, and a lot of experimentation, debugging, and iteration. 💙

⭐ Try MindVault

## 🌐 Live Demo:
https://mindvault-memory-anjali.ai.studio/

## 💻 GitHub:
https://github.com/anjaliabhilashcv/mindvault
