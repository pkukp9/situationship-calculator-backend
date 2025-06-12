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

    // Enhanced logging of screenshotUrls array
    console.log(`📥 Received ${screenshotUrls?.length || 0} screenshots:`);
    if (Array.isArray(screenshotUrls)) {
      screenshotUrls.forEach((url, index) => {
        const isBase64 = url.startsWith('data:');
        const preview = isBase64 
          ? `${url.substring(0, 100)}...` 
          : url;
        console.log(`Screenshot ${index + 1}: ${isBase64 ? '[base64 data]' : preview}`);
      });
    }

    if (!Array.isArray(screenshotUrls) || screenshotUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'screenshotUrls must be a non-empty array' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📥 Processing ${screenshotUrls.length} screenshots`);

    // First, get text content from all screenshots
    const screenshotAnalyses = await Promise.all(
      screenshotUrls.map(async (url, index) => {
        try {
          console.log(`🔍 Processing screenshot ${index + 1}/${screenshotUrls.length}`);
          
          // Determine if URL is base64 or actual URL
          const imageUrl = url.startsWith('data:') ? url : { url };
          
          const response = await openai.chat.completions.create({
            model: "gpt-4v",
            messages: [
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: imageUrl },
                  { type: "text", text: "Extract and return ONLY the text content from this screenshot. Format it as a chat conversation if applicable." }
                ]
              }
            ]
          });
          
          const extractedText = response.choices[0].message.content;
          console.log(`✓ Screenshot ${index + 1} text (${extractedText.length} chars):`);
          console.log('---BEGIN EXTRACTED TEXT---');
          console.log(extractedText);
          console.log('---END EXTRACTED TEXT---');
          
          return extractedText;
        } catch (error) {
          console.error(`❌ Error processing screenshot ${index + 1}:`);
          console.error('Error message:', error.message);
          if (error.response?.data) {
            console.error('OpenAI API Error Details:', JSON.stringify(error.response.data, null, 2));
          }
          return null;
        }
      })
    );

    // Filter out any failed extractions and combine the text
    const validTexts = screenshotAnalyses.filter(text => text !== null);
    
    if (validTexts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to extract text from any screenshots' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    const combinedText = validTexts.join('\n\n--- Next Screenshot ---\n\n');
    console.log(`📝 Combined ${validTexts.length} texts (${combinedText.length} total chars):`);
    console.log('---BEGIN COMBINED TEXT---');
    console.log(combinedText);
    console.log('---END COMBINED TEXT---');

    // Now analyze the combined text
    const response = await openai.chat.completions.create({
      model: "gpt-4",
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

Here's the conversation to analyze (from multiple screenshots):
${combinedText}`
        }
      ],
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;
    console.log("📤 AI Analysis:", content);

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
      analyses: [{
        url: screenshotUrls[0], // Include first screenshot URL for backward compatibility
        delulu_score: parseInt(deluluScore),
        delulu_description: deluluDescriptionMap[deluluScore],
        summary,
        relationship_probability: parseInt(probability),
        advice
      }],
      total_screenshots: screenshotUrls.length,
      successful_analyses: validTexts.length
    };

    console.log("📤 Final response:", result);

    return new Response(
      JSON.stringify(result),
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