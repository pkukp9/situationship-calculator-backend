import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Date,X-Api-Version',
  'Access-Control-Allow-Credentials': 'true'
};

// Handle CORS preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Ope! You forgot to spill the tea (no text provided)" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (text.length < 40) {
      return NextResponse.json(
        { error: "Ope! We need more tea (at least 40 characters)" },
        { status: 400, headers: corsHeaders }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a witty relationship analyzer with the combined personality of Carrie Bradshaw's wit and Samantha Jones' boldness from Sex and the City. Analyze text conversations and provide insights about relationship dynamics."
        },
        {
          role: "user",
          content: `Analyze this conversation and provide: 
          1. A delulu score (1-5) with a matching description:
             - Level 1: "Pookie + 1 – You're on your way to having a Pookie"
             - Level 2: "Situationship Final Boss – You talk most days but then they leave you on delivered for 6 hours"
             - Level 3: "Brainrot Baddie – You've already stalked their Spotify, Venmo, and their Mom's Facebook from 2009"
             - Level 4: "Wannabe Wifey – You've told your besties that you're getting married"
             - Level 5: "Certified Delulu – You're the mayor of Deluluville"
          2. A detailed analysis of the situation
          3. A relationship probability (0-100%)
          4. Strategic advice
          
          Here's the conversation: ${text}`
        }
      ],
    });

    const response = completion.choices[0].message.content;
    const lines = response?.split('\n') || [];
    const deluluScore = lines.find(l => l.includes('Level'))?.match(/Level (\d)/)?.[1] || '1';
    const deluluDescription = {
      '1': "Pookie + 1 – You're on your way to having a Pookie",
      '2': "Situationship Final Boss – You talk most days but then they leave you on delivered for 6 hours",
      '3': "Brainrot Baddie – You've already stalked their Spotify, Venmo, and their Mom's Facebook from 2009",
      '4': "Wannabe Wifey – You've told your besties that you're getting married",
      '5': "Certified Delulu – You're the mayor of Deluluville"
    }[deluluScore];

    const probability = lines.find(l => l.includes('%'))?.match(/(\d+)%/)?.[1] || '0';
    
    return NextResponse.json({
      delulu_score: parseInt(deluluScore),
      delulu_description: deluluDescription,
      summary: response,
      relationship_probability: parseInt(probability),
      advice: lines.slice(-1)[0] || "Keep manifesting, bestie!"
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error analyzing text:', error);
    return NextResponse.json(
      { error: "Ope! Something went wrong analyzing your situation" },
      { status: 500, headers: corsHeaders }
    );
  }
} 