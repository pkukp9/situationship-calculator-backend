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
          content: `Analyze this conversation and return a JSON object as described above. Here is the conversation to analyze:\n${combinedText}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;
    console.log("📤 AI Analysis:", content);

    // Parse the JSON response from the model
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error('❌ Failed to parse model JSON:', content);
      throw new Error('Model did not return valid JSON.');
    }

    // Create analysis result for each screenshot while maintaining the overall analysis
    const finalResult = {
      analyses: screenshotUrls.map((url, index) => ({
        url,
        deluluScale: parseInt(result.deluluScale) || 1,
        deluluLabel: result.deluluLabel || "Pookie + 1 – You're on your way to having a Pookie",
        carrieBradshawSummary: perScreenshotSummaries[index],
        relationshipProbability: parseInt(result.relationshipProbability) || 0,
        advice: result.advice || "",
        timestamp: result.timestamp || new Date().toISOString()
      })),
      total_screenshots: screenshotUrls.length,
      successful_analyses: validTexts.length,
      combined_analysis: {
        deluluScale: parseInt(result.deluluScale) || 1,
        deluluLabel: result.deluluLabel || "Pookie + 1 – You're on your way to having a Pookie",
        carrieBradshawSummary: result.carrieBradshawSummary || "",
        relationshipProbability: parseInt(result.relationshipProbability) || 0,
        advice: result.advice || "",
        timestamp: result.timestamp || new Date().toISOString()
      }
    };

    console.log("📤 Final response:", finalResult);

    return new Response(
      JSON.stringify(finalResult),
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