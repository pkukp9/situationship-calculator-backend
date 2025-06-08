import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // For now, return a mock response similar to text analysis
    // You'll add OpenAI vision API integration later
    const delulu_score = Math.floor(Math.random() * 5) + 1;
    const probability = Math.floor(Math.random() * 100);
    
    const summaries = [
      "Based on these screenshots, honey, the writing is on the wall... and it's in red ink.",
      "These messages are giving me 'he's just not that into you' energy.",
      "Screenshot evidence analyzed: this situation needs a reality check.",
      "Looking at these conversations... girl, you deserve better.",
      "The screenshots don't lie - this situationship is giving situationSHIP wreck."
    ];
    
    const advice_options = [
      "Screenshots saved, dignity preserved - now block and move on.",
      "Evidence collected. Now use it to remember why you deserve consistency.",
      "These screenshots will make great 'what not to accept' examples for your friends.",
      "Save these for your future self as a reminder of your worth.",
      "Screenshot analysis complete: time to screenshot your way out of this situation."
    ];

    const response = {
      delulu_score: delulu_score,
      summary: summaries[delulu_score - 1],
      relationship_probability: probability,
      advice: advice_options[Math.floor(Math.random() * advice_options.length)]
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Screenshot analysis error:', error);
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
