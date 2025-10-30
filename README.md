# Wallflower AI - Custom T-Shirt Design Platform

A Next.js application that allows users to create custom t-shirt designs using AI, edit them, remove backgrounds, and order them on t-shirts through Shopify integration.

## Features

- 🎨 **AI Design Generation**: Generate custom designs using Gemini 2.5 Flash (Nano Banana) via Fal.ai
- ✏️ **AI Editing**: Edit existing designs with natural language prompts
- 🖼️ **Style Transfer**: Upload a design and create new designs in the same style
- 🎯 **Background Removal**: Remove backgrounds from designs using Fal.ai
- 🛒 **Shopify Integration**: Order your designs on t-shirts directly through Shopify
- 📱 **Design Templates**: Choose from pre-made design templates (similar to playground.com)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Services**: 
  - Fal.ai (Gemini 2.5 Flash for image generation/editing)
  - Google Gemini API (for prompt optimization)
- **E-commerce**: Shopify Admin API
- **Styling**: Tailwind CSS
- **Deployment**: Vercel-ready

## Setup Instructions

### 1. Clone and Install

```bash
cd /Applications/MAMP/htdocs/dev/wallflower-ai
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Fal.ai
FAL_AI_API_KEY=your_fal_ai_api_key

# Google Gemini
GOOGLE_GENAI_API_KEY=your_google_genai_api_key

# Shopify
SHOPIFY_STORE_DOMAIN=your_store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token
SHOPIFY_ADMIN_API_ACCESS_TOKEN=your_admin_api_token
```

### 3. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Run the migration file to create the database schema:
   - Go to SQL Editor in Supabase dashboard
   - Run the contents of `supabase/migrations/001_initial_schema.sql`

### 4. Fal.ai Setup

1. Sign up for a Fal.ai account at https://fal.ai
2. Get your API key from the dashboard
3. Add it to `.env.local`

### 5. Google Gemini Setup

1. Get an API key from Google AI Studio: https://makersuite.google.com/app/apikey
2. Add it to `.env.local`

### 6. Shopify Setup

1. Create a Shopify store or use an existing one
2. Create a private app with Admin API access
3. Get your Store Domain and Access Tokens
4. Add them to `.env.local`

### 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
wallflower-ai/
├── app/
│   ├── api/
│   │   ├── designs/
│   │   │   ├── generate/route.ts      # Generate new designs
│   │   │   ├── edit/route.ts           # Edit existing designs
│   │   │   ├── style-transfer/route.ts # Style-based generation
│   │   │   └── remove-background/route.ts # Remove backgrounds
│   │   └── orders/
│   │       └── create/route.ts         # Create Shopify orders
│   ├── auth/                           # Authentication pages
│   ├── editor/                         # Design editor page
│   ├── layout.tsx
│   ├── page.tsx                        # Home page
│   └── globals.css
├── components/
│   ├── DesignEditor.tsx                # Main design editing component
│   └── DesignSelector.tsx              # Template selection component
├── lib/
│   ├── fal/
│   │   └── service.ts                  # Fal.ai integration
│   ├── gemini/
│   │   └── service.ts                  # Gemini API integration
│   ├── shopify/
│   │   └── client.ts                  # Shopify integration
│   └── supabase/
│       ├── client.ts                   # Browser Supabase client
│       ├── server.ts                   # Server Supabase client
│       └── admin.ts                    # Admin Supabase client
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql      # Database schema
```

## Usage

### Generating a Design

1. Go to the Editor page
2. Enter a description of your design in the text area
3. Click "Generate Design"
4. Wait for the AI to generate your design

### Editing a Design

1. After generating or uploading a design
2. Use the "Edit prompt" field to describe changes
3. Click "Apply Edit" to see the changes
4. Use "Remove BG" to remove the background

### Style Transfer

1. Switch to "Upload & Style" mode
2. Upload an existing design image
3. Describe the new design you want
4. Click "Create Design in Same Style"
5. The AI will create a new design maintaining the same style

### Ordering on T-Shirt

1. After creating/editing your design
2. Click "Order on T-Shirt"
3. You'll be redirected to Shopify checkout

## API Endpoints

### POST `/api/designs/generate`
Generate a new design from a text prompt.

**Body:**
```json
{
  "prompt": "A minimalist geometric design",
  "aspectRatio": "1:1"
}
```

### POST `/api/designs/edit`
Edit an existing design.

**Body:**
```json
{
  "designId": "uuid",
  "imageUrl": "https://...",
  "editPrompt": "Make it more vibrant",
  "noiseLevel": 0.3
}
```

### POST `/api/designs/style-transfer`
Create a new design in the style of a reference image.

**Body:**
```json
{
  "referenceImageUrl": "https://...",
  "prompt": "A new design description",
  "aspectRatio": "1:1"
}
```

### POST `/api/designs/remove-background`
Remove background from an image.

**Body:**
```json
{
  "imageUrl": "https://..."
}
```

### POST `/api/orders/create`
Create a Shopify order for a design.

**Body:**
```json
{
  "designId": "uuid",
  "imageUrl": "https://...",
  "title": "My Custom Design",
  "price": "29.99"
}
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add all environment variables
4. Deploy!

### Database Migration

Make sure to run the Supabase migration in production as well.

## Reference

This project was inspired by patterns from the `tryon` project (which uses Firebase) but adapted to use:
- Supabase instead of Firebase
- Next.js App Router instead of Vite
- Server-side API routes instead of Firebase Functions

## License

MIT
CI: trigger deploy 2025-10-30T19:25:48Z
