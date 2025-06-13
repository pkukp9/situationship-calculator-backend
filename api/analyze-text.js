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
          content: `You are a JSON-only API. Return a valid JSON object with exactly these 6 fields, no nesting:

{
  "carrieBradshawSummary": "string (bullet points, with Paul Graham's logic of being clear, direct, and insightful. Think with high emotional intelligence. Have a summary paragraph, then what they might be looking for and how to make them more interested in you, all formatted in a single plain-text string)",
  "relationshipProbability": number (0-100),
  "deluluScale": number (1-5),
  "deluluLabel": "string (one of: 'Pookie + 1 – You're on your way to having a Pookie', 'Situationship Final Boss – You talk most days but then they leave you on delivered for 6 hours', 'Brainrot Baddie – You've already stalked their Spotify, Venmo, and their Mom's Facebook from 2009', 'Wannabe Wifey – You've told your besties that you're getting married', 'Certified Delulu – You're the mayor of Deluluville')",
  "advice": "string (2-4 sentences max, in Paul Graham's writing style: clear, direct, and insightful. Focus on specific, actionable steps that respect both people's autonomy. Example: 'Ask about their perspective on the AI ethics article, then share your own thoughts. If the conversation flows naturally, suggest exploring a related topic together. Remember that genuine intellectual connection often leads to deeper emotional bonds.' No fluff, no filler, just clear guidance.)",
  "timestamp": "June 13, 2025 at 03:00 PM"
}

Do not return a nested object for carrieBradshawSummary. Output a single flat string only.
Do not add any explanation, commentary, or Markdown. Only output flat JSON. Do not include Markdown, commentary, nested objects, or explanation. All fields must match the types exactly.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    // Parse the JSON response from the model with markdown handling
    let result;
    try {
      const raw = response.choices?.[0]?.message?.content ?? "";
      const cleaned = raw
        .replace(/```json\s*/, '')  // Remove ```json
        .replace(/```$/, '')        // Remove ending ```
        .trim();

      result = JSON.parse(cleaned);
      
      // Return only the exact fields we want
      return new Response(
        JSON.stringify({
          carrieBradshawSummary: result.carrieBradshawSummary,
          relationshipProbability: result.relationshipProbability,
          deluluScale: result.deluluScale,
          deluluLabel: result.deluluLabel,
          advice: result.advice,
          timestamp: result.timestamp
        }),
        { 
          status: 200, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    } catch (e) {
      console.error('❌ Failed to parse model JSON:', response.choices[0].message.content);
      throw new Error('Model did not return valid JSON.');
    }
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