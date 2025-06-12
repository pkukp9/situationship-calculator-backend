// Version: 3.0 - Vercel Edge Function with improved request handling
export const config = { runtime: 'edge' };

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req) {
  console.log("🔍 analyze-text function was invoked");
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    console.log("📥 Incoming analyze-text payload:", body);

    const { text } = body;

    if (!text || typeof text !== 'string') {
      const errorResponse = { error: 'Text content is required' };
      console.log("❌ Error response:", errorResponse);
      return new Response(
        JSON.stringify(errorResponse),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Received analyze-text request:", { text });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a sharp, witty relationship analyst who combines playful insight with grounded, logical advice. Analyze conversations with a blend of warmth and directness. Focus on clear, actionable insights without using pop culture references. Format your response in exactly 4 numbered sections, each on its own line, without any additional formatting or embedded section titles in the content."
        },
        {
          role: "user",
          content: `Analyze this conversation and output exactly 4 lines in this order:

1. Delulu Score: Level (1-5) with description:
   - Level 1: "Pookie + 1 – You're on your way to having a Pookie"
   - Level 2: "Situationship Final Boss – You talk most days but then they leave you on delivered for 6 hours"
   - Level 3: "Brainrot Baddie – You've already stalked their Spotify, Venmo, and their Mom's Facebook from 2009"
   - Level 4: "Wannabe Wifey – You've told your besties that you're getting married"
   - Level 5: "Certified Delulu – You're the mayor of Deluluville"

2. Detailed Analysis: Provide 2-3 analytical sentences about the conversation dynamics, patterns, and implications

3. Relationship Probability: A percentage (0-100%) with brief, logical reasoning

4. Strategic Advice: One clear, actionable recommendation based on the observed patterns (no embedded formatting or section titles)

Here's the conversation to analyze:
${text}`
        }
      ],
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;
    
    // Process all regex matches in parallel for better performance
    const [deluluScore, summaryMatch, probability, adviceMatch] = await Promise.all([
      content.match(/1\.\s*Delulu Score:.*Level (\d)/)?.[1] || '1',
      content.match(/2\.\s*Detailed Analysis:\s*(.*?)(?=3\.)/s),
      content.match(/3\.\s*Relationship Probability:\s*(\d+)%/)?.[1] || '0',
      content.match(/4\.\s*Strategic Advice:\s*(.*?)$/s)
    ]);

    const summary = summaryMatch ? summaryMatch[1].trim() : "";
    const advice = adviceMatch ? adviceMatch[1].trim() : "Keep manifesting, bestie!";

    const deluluDescriptionMap = {
      '1': "Pookie + 1 – You're on your way to having a Pookie",
      '2': "Situationship Final Boss – You talk most days but then they leave you on delivered for 6 hours",
      '3': "Brainrot Baddie – You've already stalked their Spotify, Venmo, and their Mom's Facebook from 2009",
      '4': "Wannabe Wifey – You've told your besties that you're getting married",
      '5': "Certified Delulu – You're the mayor of Deluluville"
    };

    const result = {
      delulu_score: parseInt(deluluScore),
      delulu_description: deluluDescriptionMap[deluluScore],
      summary,
      relationship_probability: parseInt(probability),
      advice
    };

    console.log("📤 Outgoing analyze-text response:", result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('❌ Error in analyze-text:', error);
    const errorResponse = { error: error.message };
    console.log("❌ Error response:", errorResponse);
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    );
  }
} 