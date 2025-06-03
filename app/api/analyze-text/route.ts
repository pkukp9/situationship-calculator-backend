import { NextResponse } from 'next/server';
import { analyzeText } from '@/app/utils/analyzeText';

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { text } = body;

    // Analyze the text
    const analysis = await analyzeText(text);
    
    return NextResponse.json(analysis);
  } catch (error) {
    // Log detailed error information
    console.error('Detailed error information:');
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const userMessage = 
      errorMessage.includes("40 characters") ? "Ope! We need more tea (at least 40 characters)" :
      errorMessage.includes("No text provided") ? "Ope! You forgot to spill the tea (no text provided)" :
      "Ope! Something went wrong analyzing your situation";

    return NextResponse.json(
      { error: userMessage, details: errorMessage },
      { status: 500 }
    );
  }
}
