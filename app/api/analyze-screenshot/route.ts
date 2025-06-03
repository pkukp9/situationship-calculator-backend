import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to validate and parse JSON with fallback
function safeJSONParse(text: string) {
  try {
    // First try direct parsing
    return JSON.parse(text);
  } catch (e) {
    // If that fails, try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        throw new Error('Failed to parse JSON from response');
      }
    }
    throw new Error('No valid JSON found in response');
  }
}

export async function POST(request: Request) {
  try {
    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: "Ope! You forgot to upload a screenshot" },
        { status: 400 }
      );
    }

    // Convert File to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a relationship analyzer that MUST ALWAYS respond in valid, parseable JSON format.
Your response must ONLY contain a JSON object with these exact fields:
{
  "delulu_score": number between 1-5,
  "summary": string,
  "relationship_probability": number between 0-100,
  "advice": string
}
Do not include any other text, markdown, or formatting outside the JSON object.`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Analyze this conversation screenshot and respond with ONLY a JSON object containing: 1) delulu_score (1-5, where 1=grounded, 5=delusional about relationship potential), 2) summary (brief dynamic summary), 3) relationship_probability (0-100%), 4) advice (concrete next steps)"
            },
            {
              type: "image_url",
              image_url: {
                "url": `data:${file.type};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.7, // Slightly reduce randomness to encourage consistent formatting
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('Raw OpenAI response:', content); // Debug log

    // Try to parse the JSON response with fallback handling
    const analysis = safeJSONParse(content);

    // Validate the required fields
    const requiredFields = ['delulu_score', 'summary', 'relationship_probability', 'advice'];
    const missingFields = requiredFields.filter(field => !(field in analysis));
    
    if (missingFields.length > 0) {
      throw new Error(`Invalid response format. Missing fields: ${missingFields.join(', ')}`);
    }

    // Validate field types and ranges
    if (typeof analysis.delulu_score !== 'number' || analysis.delulu_score < 1 || analysis.delulu_score > 5) {
      throw new Error('Invalid delulu_score: must be a number between 1 and 5');
    }
    if (typeof analysis.relationship_probability !== 'number' || analysis.relationship_probability < 0 || analysis.relationship_probability > 100) {
      throw new Error('Invalid relationship_probability: must be a number between 0 and 100');
    }
    
    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error processing screenshot:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const userMessage = 
      errorMessage.includes("JSON") ? "Ope! The AI's response wasn't in the right format. Try again?" :
      errorMessage.includes("content type") ? "Ope! There was an issue with the image format" :
      errorMessage.includes("model") ? "Ope! There was an issue with the AI model configuration" :
      errorMessage.includes("Missing fields") ? "Ope! The AI skipped some parts of the analysis. Try again?" :
      errorMessage.includes("Invalid delulu_score") ? "Ope! The AI's scoring was off. Try again?" :
      errorMessage.includes("Invalid relationship_probability") ? "Ope! The AI's probability was off. Try again?" :
      "Ope! Something went wrong analyzing your screenshot";

    return NextResponse.json(
      { error: userMessage, details: errorMessage },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 