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
          content: `You are a sharp, witty relationship analyst who combines playful insight with grounded, logical advice. Analyze conversations with a blend of warmth and directness. Focus on clear, actionable insights without using pop culture references. Your output must be valid JSON, matching the following structure and requirements:

{
  "deluluScale": number (1-5, lower = more likely relationship),
  "deluluLabel": string,
  "carrieBradshawSummary": string (format as: "Summary paragraph\n\n✨ What they might be looking for:\n- Point 1\n- Point 2\n\n💖 How to make them feel appreciated:\n- Point 1\n- Point 2"),
  "relationshipProbability": number (0-100),
  "advice": string (format as: "- Step 1\n- Step 2\n- Step 3"),
  "timestamp": string (ISO format)
}

The carrieBradshawSummary should include:
1. A concise summary paragraph
2. "✨ What they might be looking for:" followed by 2-3 bullet points
3. "💖 How to make them feel appreciated:" followed by 2-3 bullet points

The advice should be 2-4 very specific, actionable steps.

Do not include any extra text or formatting outside the JSON object.`
        },
        {
          role: "user",
          content: `Analyze this conversation and return a JSON object as described above. Here is the conversation to analyze:\n${text}`
        }
      ],
      max_tokens: 1000
    });

    // Parse the JSON response from the model
    let result;
    try {
      result = JSON.parse(response.choices[0].message.content);
    } catch (e) {
      console.error('❌ Failed to parse model JSON:', response.choices[0].message.content);
      throw new Error('Model did not return valid JSON.');
    }

    // Ensure all required fields are present and properly formatted
    const finalResult = {
      deluluScale: parseInt(result.deluluScale) || 1,
      deluluLabel: result.deluluLabel || "Pookie + 1 – You're on your way to having a Pookie",
      carrieBradshawSummary: result.carrieBradshawSummary || "",
      relationshipProbability: parseInt(result.relationshipProbability) || 0,
      advice: result.advice || "",
      timestamp: result.timestamp || new Date().toISOString()
    };

    console.log("📤 Outgoing analyze-text response:", finalResult);
    console.log(JSON.stringify(finalResult, null, 2));

    return new Response(
      JSON.stringify(finalResult),
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