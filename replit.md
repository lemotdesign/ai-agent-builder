# replit.md

## Overview
This AI Agent Builder application empowers users to create, manage, and deploy conversational AI agents for lead collection. It replaces traditional forms with intelligent, embeddable chat experiences, now featuring a hybrid approach that combines conversational AI with structured validation and user confirmation for enterprise-grade data accuracy. The system supports cutting-edge AI models like Grok-4 and GPT-5, enabling dynamic adaptation of conversation flow based on specific form field requirements and intelligent data extraction.

## Recent Changes (August 28, 2025)
### Production Connectivity Resolution
- **CRITICAL FIX**: Resolved production API endpoint 500 errors affecting all widget chat functionality
- **JavaScript Reference Errors**: Fixed variable declaration order and type safety issues in chat endpoints
- **Error Handling Enhancement**: Added comprehensive error logging and graceful fallback responses
- **Development Testing**: Confirmed all fixes working locally with proper lead capture and conversation flow
- **Deployment Ready**: Code optimized for production deployment to restore widget functionality

### Standalone Calling Agent System Planning
- **Strategic Pivot**: Redesigned voice solution as standalone calling agent system for inbound/outbound calls
- **Architecture Design**: Leverages existing SMSF specialists and forms for voice-first lead capture
- **Implementation Strategy**: Dedicated phone-based conversation system using Twilio + OpenAI Realtime API
- **Campaign Management**: Outbound calling capabilities with answering machine detection and lead tracking

### Rachel Agent Conversation Flow Optimization
- **CRITICAL FIX**: Resolved rigid conversation loops in Rachel (SMSF Administration Manager, Agent ID 10)
- **LLM Expert Audit**: Identified over-rigid personality causing repetitive questioning patterns
- **Conversation Memory**: Enhanced system to track conversation history and prevent repetitive introductions
- **Natural Flow**: Implemented conversation context awareness to build on previous responses
- **Production Status**: Widget continues capturing leads (60+ total) while conversation quality improved

### CTO Technology Architecture Documentation
- **Stakeholder Engagement**: Created comprehensive CTO-level architecture overview for creative team collaboration
- **System Flow Visualization**: Documented agent interconnectivity, form integration, and personality influence systems
- **Operational Structure**: Defined clear technology stack and deployment architecture for stakeholder presentations
- **Creative Team Integration**: Simplified flow diagrams for visual design and content strategy implementation
- **Detailed Technical Architecture**: Documented complete lead reception flow, AI entry points, and functional component interactions
- **Connection Mechanisms**: Mapped exact pathways from widget initialization through lead capture with AI processing points

## User Preferences
Preferred communication style: Simple, everyday language.
Technical documentation: CTO-level architecture documentation required for stakeholder engagement with creative teams.

## System Architecture
The application utilizes a full-stack monorepo architecture, separating frontend, backend, and shared components, and emphasizing AI-driven conversational experiences.

### Core Architecture Decisions
- **Full-Stack Monorepo**: React/TypeScript frontend, Express.js backend, and shared components for clear separation of concerns.
- **AI-Driven Conversations**: Integration of xAI/Grok and OpenAI GPT APIs for dynamic, form-guided dialogues, shifting from rigid forms.
- **Real-time Interaction**: WebSocket support for live chat experiences.
- **Database**: PostgreSQL with Drizzle ORM for type-safe data management.
- **Authentication**: Replit OAuth with robust session management.
- **UI/UX Design**: Utilizes shadcn/ui and Tailwind CSS for a modern, accessible, and responsive interface, including comprehensive white-label branding.
- **Multi-Agent Orchestration**: Supports complex multi-agent systems with intelligent routing, context preservation, and seamless handovers.
- **Form-Guided Conversations**: Agents intelligently extract and collect data for forms through natural conversation, with AI-powered data extraction and progress tracking.
- **Global Business System**: Unified system for company content and global business attributes, adaptable for any industry.
- **Mobile Responsiveness**: Comprehensive mobile-first design ensuring seamless user experience across devices.
- **Shadow DOM Widget**: Production-ready embeddable widget with complete CSS isolation and cross-platform mobile compatibility, designed to prevent JavaScript conflicts.

### Technical Implementation Highlights
- **Frontend**: React 18, TypeScript, Vite, Wouter for routing, TanStack Query for server state.
- **Backend**: Express.js, TypeScript, ESM modules, RESTful API, Drizzle ORM with Neon serverless PostgreSQL.
- **Real-time Features**: WebSocket for chat, real-time audio processing (Whisper speech-to-text, TTS-1-HD voice synthesis).
- **Advanced Features**: Analytics dashboard, multi-language support (22 languages), webhook integration (Salesforce, HubSpot, Zapier), AI model fine-tuning, multi-agent orchestration, and a robust conversation memory system.
- **Conversation Flow**: AI-powered data extraction with enhanced pattern recognition and contextual understanding to prevent conversation loops.

### Feature Specifications
- **AI Agent Builder**: Create and configure AI agents with custom personalities, voice settings, and conversational flows.
- **Lead Collection**: AI agents intelligently extract and manage lead information during conversations, with flexible finalization logic.
- **Conversation Management**: Comprehensive conversation history linking with leads, displaying transcripts and extracted data.
- **Form Builder**: Design forms with agent-centric field assignments and conversational prompts for natural data collection.
- **Analytics Dashboard**: Visualizations for conversation trends, agent performance, and lead sources.
- **External Integrations**: Webhook system for CRM connectivity and custom integrations.
- **White-Labeling**: Customizable branding (colors, logos, domains) across the application and embeddable widgets.

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: Serverless PostgreSQL
- **drizzle-orm**: ORM for database interactions
- **@tanstack/react-query**: Server state management in frontend
- **@radix-ui/**: Accessible UI component primitives
- **openid-client**: OAuth authentication library
- **ws**: WebSocket server implementation

### AI Services
- **xAI/Grok API**: Grok-4 models with 256K context and real-time search.
- **OpenAI GPT-5**: Unified intelligence models with 272K context and reasoning capabilities.
- **Model Configuration Service**: Intelligent model selection, pricing optimization, and capability-based routing.
- **Browser Speech APIs**: Text-to-speech and speech-to-text capabilities.
- **OpenAI Whisper**: Speech-to-text for audio processing.

### Development Tools
- **Vite**: Frontend build tool
- **TypeScript**: For type safety
- **Tailwind CSS**: Utility-first CSS framework
- **ESLint/Prettier**: Code quality and formatting tools