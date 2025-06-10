# Situationship Calculator

A fun tool to analyze your situationship using AI-powered insights, delivered with the wit and wisdom of Sex and the City.

## Project Structure

This is a monorepo containing both the frontend and API:

- `/` - Frontend (Vite + React)
- `/api` - Backend (Next.js API routes)

## Development

To run the project locally:

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create `.env.local` in the `/api` directory with:
```
OPENAI_API_KEY=your_key_here
```

3. Run development servers:

Frontend:
```bash
npm run dev:frontend
```

API:
```bash
npm run dev:api
```

## Deployment

### Frontend
The frontend is deployed on Lovable at https://situationship-calculator.lovable.app/

### API
The API is deployed on Vercel. To deploy:

1. Connect your GitHub repository to Vercel
2. Set the root directory to `/api`
3. Add environment variables in Vercel dashboard:
   - `OPENAI_API_KEY`
4. Deploy!

## API Endpoints

### POST /api/analyze-text
Analyzes text conversations with AI-powered insights.

### POST /api/analyze-screenshot
Analyzes screenshots of conversations using GPT-4 Vision.

Both endpoints return:
- Delulu Score (1-5 scale with fun descriptions)
- Detailed situation analysis
- Relationship probability
- Strategic advice

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
