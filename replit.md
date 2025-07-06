# Civil Engineering BOQ Assistant

## Overview

This is a full-stack web application designed to help civil engineers in India prepare Excel-based cost estimates for public works. The application allows users to upload or manually input Bill of Quantities (BOQ), match items with State Schedule Rates (SSR), and generate professional Excel reports with proper formatting and calculations.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: Radix UI components with shadcn/ui styling
- **State Management**: React Query (TanStack Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **File Upload**: Multer for handling PDF uploads
- **Session Management**: Express sessions with PostgreSQL store

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon Database
- **ORM**: Drizzle ORM for type-safe database operations
- **In-Memory Storage**: Fallback memory storage for development
- **File Storage**: Local file system for PDF uploads

## Key Components

### Database Schema
- **SSR Items**: Store item codes, descriptions, units, rates, and categories
- **SSR Versions**: Manage different versions of State Schedule Rates
- **BOQ Items**: Store project-specific quantities and calculations
- **Projects**: Project metadata and totals

### Core Features
1. **SSR Management**: Upload and parse PDF rate schedules
2. **BOQ Input**: Manual entry or bulk import of quantities
3. **Rate Matching**: Intelligent search and matching of SSR items
4. **Excel Export**: Generate formatted cost estimates
5. **Live Preview**: Real-time calculation updates

### UI Components
- **BOQ Input Form**: Form for adding individual line items
- **Live Preview Table**: Real-time display of project totals
- **SSR Management Modal**: Interface for uploading rate schedules
- **Combobox**: Advanced dropdown for SSR item selection

## Data Flow

1. **SSR Upload**: PDF files are uploaded and parsed to extract rate data
2. **Project Creation**: Users create projects with basic metadata
3. **Item Entry**: BOQ items are added with quantity and unit information
4. **Rate Lookup**: System searches SSR database for matching rates
5. **Calculation**: Automatic computation of amounts (quantity × rate)
6. **Export**: Generate Excel files with professional formatting

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight routing
- **multer**: File upload handling
- **express**: Web server framework

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Development Dependencies
- **vite**: Build tool and development server
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Production bundling

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: esbuild bundles server code to `dist/index.js`
3. **Database Migration**: Drizzle Kit handles schema migrations

### Production Configuration
- **Environment Variables**: DATABASE_URL for PostgreSQL connection
- **Static Files**: Served from `dist/public`
- **API Routes**: Express server handles `/api/*` endpoints

### Development Mode
- **Hot Module Replacement**: Vite dev server with HMR
- **TypeScript**: Real-time type checking
- **Database**: Direct connection to development database

## Changelog

```
Changelog:
- July 06, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```