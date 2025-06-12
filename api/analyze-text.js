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
  "delulu_score": number (1-5, lower = more likely relationship),
  "delulu_description": string,
  "carrieBradshawSummary": {
    "summary": string (a concise summary paragraph of what's really happening),
    "what_they_might_be_looking_for": [
      // 2-4 emotionally intelligent bullet points, answering:
      // - What is it that the other person in the texts wants to hear, based on what they're saying?
      // - How can the user make them feel seen, heard, and appreciated in a way that puts them at ease?
    ]
  },
  "relationship_probability": number (0-100, must align with delulu_score and emotional tone),
  "advice": [
    // 2-3 highly actionable, behaviorally specific steps, rooted in the analysis and what the other person responds well to
    // Each step should account for emotional tone and be specific (e.g., "Send a thoughtful voice memo about [specific topic]", "Mention [specific shared experience] to build emotional safety")
    // Avoid vague suggestions like "reflect more" or "be more open"
  ]
}

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

    // Ensure backward compatibility with old fields
    result.delulu_score = parseInt(result.delulu_score);
    result.relationship_probability = parseInt(result.relationship_probability);
    result.delulu_description = result.delulu_description || '';
    result.carrieBradshawSummary = result.carrieBradshawSummary || {
      summary: '',
      what_they_might_be_looking_for: []
    };
    result.advice = result.advice || [];

    console.log("📤 Outgoing analyze-text response:", result);
    console.log(JSON.stringify(result, null, 2));

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