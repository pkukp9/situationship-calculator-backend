import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;
    
    if (!text || text.length < 10) {
      return NextResponse.json(
        { error: 'Text is required and must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Mock analysis logic
    const delulu_score = Math.floor(Math.random() * 5) + 1;
    const probability = Math.floor(Math.random() * 100);
    
    const summaries = [
      "Honey, I couldn't help but wonder... are you living in a fantasy?",
      "Darling, the signs are clearer than a Manolo Blahnik in a sea of knockoffs.",
      "Sweet summer child, reality called and left a voicemail.",
      "Babe, you're serving main character energy in someone else's story.",
      "Love, you're reading more into this than a literature professor."
    ];
    
    const advice_options = [
      "Focus on yourself, queen. You're the prize.",
      "Time to channel that energy into something that actually deserves you.",
      "Remember: you teach people how to treat you.",
      "Stop watering dead plants, honey.",
      "Your future self will thank you for this reality check."
    ];

    const response = {
      delulu_score: delulu_score,
      summary: summaries[delulu_score - 1],
      relationship_probability: probability,
      advice: advice_options[Math.floor(Math.random() * advice_options.length)]
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
