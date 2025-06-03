# Situationship Calculator API

Backend API for the Situationship Calculator that analyzes text and screenshots of conversations to determine relationship potential.

## API Endpoints

- `/api/analyze-text` - POST endpoint for analyzing text conversations
- `/api/analyze-screenshot` - POST endpoint for analyzing screenshots of conversations

## Environment Variables

Required environment variables:
- `OPENAI_API_KEY` - Your OpenAI API key

## Deployment Instructions

1. Fork or clone this repository
2. Install Vercel CLI: `npm i -g vercel`
3. Login to Vercel: `vercel login`
4. Deploy to Vercel: `vercel`
5. Set environment variables in Vercel:
   ```bash
   vercel env add OPENAI_API_KEY
   ```
6. Deploy to production:
   ```bash
   vercel --prod
   ```

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` with required environment variables:
   ```
   OPENAI_API_KEY=your_key_here
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

## Frontend Integration

The API endpoints can be called from the Lovable frontend at https://situationship-calculator.lovable.app/ using:

```javascript
// Text analysis
fetch('https://your-vercel-url/api/analyze-text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'conversation text here' })
});

// Screenshot analysis
const formData = new FormData();
formData.append('image', imageFile);
fetch('https://your-vercel-url/api/analyze-screenshot', {
  method: 'POST',
  body: formData
});
```

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
