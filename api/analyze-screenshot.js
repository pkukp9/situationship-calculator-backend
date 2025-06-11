// Version: 3.0 - Vercel Edge Function with improved request handling
export const config = { runtime: 'edge' };

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req) {
  console.log("🧪 analyze-screenshot function was invoked");
  
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
    const { screenshotUrls } = body;

    if (!Array.isArray(screenshotUrls) || screenshotUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'screenshotUrls must be a non-empty array' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    const results = await Promise.all(
      screenshotUrls.map(async (url) => {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a sharp, witty relationship analyst who combines playful insight with grounded, logical advice. Analyze conversation screenshots with a blend of warmth and directness, maintaining a tone that's both engaging and practical. Focus on clear, actionable insights without relying on pop culture references or narrative flourishes. Keep your analysis structured but ensure each section is focused and self-contained."
              },
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url } },
                  {
                    type: "text",
                    text: `Analyze this conversation screenshot and provide:
                    1. A delulu score (1-5) with a matching description:
                       - Level 1: "Pookie + 1 – You're on your way to having a Pookie"
                       - Level 2: "Situationship Final Boss – You talk most days but then they leave you on delivered for 6 hours"
                       - Level 3: "Brainrot Baddie – You've already stalked their Spotify, Venmo, and their Mom's Facebook from 2009"
                       - Level 4: "Wannabe Wifey – You've told your besties that you're getting married"
                       - Level 5: "Certified Delulu – You're the mayor of Deluluville"
                    2. Detailed Analysis: Provide a clear, focused assessment of the conversation dynamics and patterns
                    3. Relationship Probability: Give a percentage (0-100%) with brief, logical reasoning
                    4. Strategic Advice: Offer one concise, actionable recommendation based specifically on the conversation patterns observed`
                  }
                ]
              }
            ],
            max_tokens: 1000
          });

          const content = response.choices[0].message.content;
          console.log("RAW AI RESPONSE:", content);

          // Extract Delulu Score
          const deluluScore = content.match(/Level (\d)/)?.[1] || '1';
          console.log("Extracted delulu score:", deluluScore);

          // Extract Relationship Probability
          const probability = content.match(/Relationship Probability:\s*(\d+)%/)?.[1] || '0';
          console.log("Extracted probability:", probability);

          // Extract Summary (between "2. Detailed Analysis:" and "3. Relationship Probability:")
          const summaryMatch = content.match(/2\.\s*Detailed Analysis:(.*?)3\.\s*Relationship Probability:/s);
          const summary = summaryMatch ? summaryMatch[1].trim() : "";
          console.log("Extracted summary:", summary);

          // Extract Advice (everything after "4. Strategic Advice:")
          const adviceMatch = content.match(/4\.\s*Strategic Advice:(.*?)$/s);
          const advice = adviceMatch ? adviceMatch[1].trim() : "Keep manifesting, bestie!";
          console.log("Extracted advice:", advice);

          const deluluDescriptionMap = {
            '1': "Pookie + 1 – You're on your way to having a Pookie",
            '2': "Situationship Final Boss – You talk most days but then they leave you on delivered for 6 hours",
            '3': "Brainrot Baddie – You've already stalked their Spotify, Venmo, and their Mom's Facebook from 2009",
            '4': "Wannabe Wifey – You've told your besties that you're getting married",
            '5': "Certified Delulu – You're the mayor of Deluluville"
          };

          return {
            url,
            delulu_score: parseInt(deluluScore),
            delulu_description: deluluDescriptionMap[deluluScore],
            summary,
            relationship_probability: parseInt(probability),
            advice,
            error: null
          };
        } catch (error) {
          console.error(`Error analyzing screenshot ${url}:`, error);
          return {
            url,
            error: error.message,
            delulu_score: null,
            delulu_description: null,
            summary: null,
            relationship_probability: null,
            advice: null
          };
        }
      })
    );

    console.log("Final results array:", JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify({
        analyses: results,
        total_screenshots: screenshotUrls.length,
        successful_analyses: results.filter(r => !r.error).length
      }),
      { 
        status: 200, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    );
  }
} 