// Version: 3.0 - Vercel Edge Function with improved request handling
export const config = { runtime: 'edge' };

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req) {
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
                content: "You are a witty relationship analyzer with the combined personality of Carrie Bradshaw's wit and Samantha Jones' boldness from Sex and the City. Analyze conversation screenshots and provide insights about relationship dynamics."
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
                    2. A detailed analysis of the situation
                    3. A relationship probability (0-100%)
                    4. Strategic advice`
                  }
                ]
              }
            ],
            max_tokens: 1000
          });

          const content = response.choices[0].message.content || "";
          console.log("RAW AI RESPONSE:", content);
          
          const lines = content.split('\n').filter(Boolean);
          console.log("Parsed lines:", lines);

          // Extract delulu score first to help with summary bounds
          const levelLine = lines.find(line => line.includes('Level'));
          const deluluScore = levelLine?.match(/Level (\d)/)?.[1] || '1';
          console.log("Found level line:", levelLine);
          console.log("Extracted delulu score:", deluluScore);

          // Extract probability
          const probabilityLine = lines.find(line => line.includes('%'));
          const probability = probabilityLine?.match(/(\d+)%/)?.[1] || '0';
          console.log("Found probability line:", probabilityLine);
          console.log("Extracted probability:", probability);

          // Extract summary: content between delulu score and probability
          const levelIndex = lines.findIndex(line => line.includes('Level'));
          const probIndex = lines.findIndex(line => line.includes('%'));
          const summary = (levelIndex !== -1 && probIndex !== -1)
            ? lines.slice(levelIndex + 1, probIndex).join('\n')
            : content;
          console.log("Extracted summary:", summary);

          const deluluDescriptionMap = {
            '1': "Pookie + 1 – You're on your way to having a Pookie",
            '2': "Situationship Final Boss – You talk most days but then they leave you on delivered for 6 hours",
            '3': "Brainrot Baddie – You've already stalked their Spotify, Venmo, and their Mom's Facebook from 2009",
            '4': "Wannabe Wifey – You've told your besties that you're getting married",
            '5': "Certified Delulu – You're the mayor of Deluluville"
          };

          // Extract advice: prefer line starting with 'Advice:' or use last line
          const adviceLine = lines.find(line => 
            line.toLowerCase().includes('advice:') ||
            line.toLowerCase().startsWith('advice')
          );
          const advice = adviceLine || lines.at(-1) || "Keep manifesting, bestie!";
          console.log("Extracted advice:", advice);

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