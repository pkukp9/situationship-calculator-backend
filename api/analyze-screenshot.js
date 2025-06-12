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
          
          // Format image URL correctly for OpenAI Vision API
          const imageUrl = {
            url: url.startsWith('data:') ? url : url
          };
          
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
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
          console.log(`\n🔍 Raw text from screenshot ${index + 1}/${screenshotUrls.length}:`);
          console.log('------------------------');
          console.log(extractedText);
          console.log('------------------------');
          console.log(`Characters: ${extractedText.length}`);
          
          // Log if the text seems empty or contains error messages
          let rejectionReason = null;
          if (!extractedText || extractedText.length < 10) {
            rejectionReason = `too short (< 10 chars)`;
            console.warn(`⚠️ Warning: Screenshot ${index + 1} extracted text is very short or empty`);
          }
          if (extractedText.toLowerCase().includes('error') || extractedText.toLowerCase().includes('could not')) {
            rejectionReason = rejectionReason ? rejectionReason + ' and error-like content' : 'error-like content';
            console.warn(`⚠️ Warning: Screenshot ${index + 1} might contain an error message`);
          }

          if (rejectionReason) {
            console.log('------------------------');
            console.log(`❌ Extracted text for screenshot ${index + 1} rejected:`);
            console.log('Raw extracted text:', extractedText);
            console.log('Character count:', extractedText ? extractedText.length : 0);
            console.log('Rejection reason:', rejectionReason);
            console.log('------------------------');
            throw new Error(`Failed: ${rejectionReason}.`);
          }

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

    // After extracting text from all screenshots, analyze each one individually for summary
    const perScreenshotSummaries = await Promise.all(
      validTexts.map(async (text, i) => {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a sharp, witty relationship analyst. Summarize the following chat in 1-2 sentences."
              },
              {
                role: "user",
                content: text
              }
            ],
            max_tokens: 200
          });
          const summary = response.choices[0].message.content;
          console.log(`🧠 GPT summary raw output for screenshot ${i + 1}:`, summary);
          console.log(`📏 Length: ${summary?.length}`);
          if (!summary || summary.length < 5) {
            console.warn(`⚠️ Summary too short or undefined for screenshot ${i + 1}. Marking as \"Analysis unavailable\"`);
            return "Analysis unavailable";
          }
          return summary;
        } catch (err) {
          console.error(`❌ Error getting summary for screenshot ${i + 1}:`, err);
          return "Analysis unavailable";
        }
      })
    );

    // Now analyze the combined text
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
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;
    console.log("📤 AI Analysis:", content);

    // Improved regex patterns to better handle multi-screenshot analysis
    const [deluluScore, summaryMatch, probability, adviceMatch] = await Promise.all([
      // Match Delulu Score, including when it's part of a longer line
      content.match(/(?:Delulu Score:|^1\.)[^\n]*?Level\s*(\d+)/i)?.[1] || '1',
      // Match Detailed Analysis, being more flexible with formatting
      content.match(/(?:Detailed Analysis:|^2\.)\s*((?:(?!^3\.).)*)/ms),
      // Match Relationship Probability percentage
      content.match(/(?:Relationship Probability:|^3\.)[^\n]*?(\d+)%/i)?.[1] || '0',
      // Match Strategic Advice, being more flexible with formatting
      content.match(/(?:Strategic Advice:|^4\.)\s*(.+?)(?:\n|$)/s)
    ]);

    const summary = summaryMatch ? summaryMatch[1].trim() : "Analysis unavailable";
    const advice = adviceMatch ? adviceMatch[1].trim() : "Keep manifesting, bestie!";

    console.log("📊 Extracted values:", {
      deluluScore,
      summary: summary.substring(0, 50) + "...",
      probability,
      advice: advice.substring(0, 50) + "..."
    });

    const deluluDescriptionMap = {
      '1': "Pookie + 1 – You're on your way to having a Pookie",
      '2': "Situationship Final Boss – You talk most days but then they leave you on delivered for 6 hours",
      '3': "Brainrot Baddie – You've already stalked their Spotify, Venmo, and their Mom's Facebook from 2009",
      '4': "Wannabe Wifey – You've told your besties that you're getting married",
      '5': "Certified Delulu – You're the mayor of Deluluville"
    };

    // Create analysis result for each screenshot while maintaining the overall analysis
    const result = {
      analyses: screenshotUrls.map((url, index) => ({
        url,
        delulu_score: parseInt(deluluScore),
        delulu_description: deluluDescriptionMap[deluluScore],
        carrieBradshawSummary: {
          summary: perScreenshotSummaries[index],
          what_they_might_be_looking_for: []
        },
        relationship_probability: parseInt(probability),
        advice
      })),
      total_screenshots: screenshotUrls.length,
      successful_analyses: validTexts.length,
      combined_analysis: {
        delulu_score: parseInt(deluluScore),
        delulu_description: deluluDescriptionMap[deluluScore],
        carrieBradshawSummary: {
          summary,
          what_they_might_be_looking_for: []
        },
        relationship_probability: parseInt(probability),
        advice
      }
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