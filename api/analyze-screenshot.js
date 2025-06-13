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

    // Now analyze the combined text
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a JSON-only API that analyzes text conversations. Return a valid JSON object with exactly these 6 fields, no nesting. The carrieBradshawSummary should be a single string containing bullet points analyzing the conversation, with Paul Graham's logic of being clear, direct, and insightful. Think with high emotional intelligence. Have a summary paragraph, then what they might be looking for and how to make them more interested in you, all formatted in a single plain-text string.

{
  "carrieBradshawSummary": "string (bullet points, with Paul Graham's logic of being clear, direct, and insightful. Think with high emotional intelligence. Have a summary paragraph, then what they might be looking for and how to make them more interested in you, all formatted in a single plain-text string)",
  "relationshipProbability": number (0-100),
  "deluluScale": number (1-5),
  "deluluLabel": "string (one of: 'Pookie + 1 – You're on your way to having a Pookie', 'Situationship Final Boss – You talk most days but then they leave you on delivered for 6 hours', 'Brainrot Baddie – You've already stalked their Spotify, Venmo, and their Mom's Facebook from 2009', 'Wannabe Wifey – You've told your besties that you're getting married', 'Certified Delulu – You're the mayor of Deluluville')",
  "advice": "string (2-4 sentences max, in Paul Graham's writing style: clear, direct, and insightful. Focus on specific, actionable steps that respect both people's autonomy. Example: 'Ask about their perspective on the AI ethics article, then share your own thoughts. If the conversation flows naturally, suggest exploring a related topic together. Remember that genuine intellectual connection often leads to deeper emotional bonds.' No fluff, no filler, just clear guidance.)",
  "timestamp": "June 13, 2025 at 03:00 PM"
}

IMPORTANT: Analyze the conversation provided in the user's message. Do not give generic descriptions or character analysis. Focus on analyzing the specific conversation and providing insights based on the interaction shown.

Do not return a nested object for carrieBradshawSummary. Output a single flat string only.
Do not add any explanation, commentary, or Markdown. Only output flat JSON. Do not include Markdown, commentary, nested objects, or explanation. All fields must match the types exactly.`
        },
        {
          role: "user",
          content: combinedText
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;
    console.log("📤 AI Analysis:", content);

    // Parse the JSON response from the model with markdown handling
    let result;
    try {
      const raw = response.choices?.[0]?.message?.content ?? "";
      const cleaned = raw
        .replace(/```json\s*/, '')  // Remove ```json
        .replace(/```$/, '')        // Remove ending ```
        .trim();

      result = JSON.parse(cleaned);
      
      // Map old field names to new ones if needed
      const mappedResult = {
        carrieBradshawSummary: result.carrieBradshawSummary || result.summary,
        relationshipProbability: result.relationshipProbability || result.relationship_probability,
        deluluScale: result.deluluScale || result.delulu_score,
        deluluLabel: result.deluluLabel || result.delulu_description,
        advice: result.advice,
        timestamp: result.timestamp || new Date().toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      };
      
      // Return only the exact fields we want
      return new Response(
        JSON.stringify(mappedResult),
        { 
          status: 200, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    } catch (e) {
      console.error('❌ Failed to parse model JSON:', content);
      throw new Error('Model did not return valid JSON.');
    }
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