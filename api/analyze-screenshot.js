// Version: 2.2 - Simplified URL handling with OpenAI's native URL support
console.log('Screenshot API deployed:', new Date().toISOString());

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  // CORS setup
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Handle preflight
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { screenshotUrls } = await req.json();

    if (!Array.isArray(screenshotUrls) || screenshotUrls.length === 0) {
      return res.status(400).json({ error: 'screenshotUrls must be a non-empty array' });
    }

    const results = await Promise.all(
      screenshotUrls.map(async (url) => {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
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

          const content = response.choices[0].message.content;
          const lines = content?.split('\n') || [];
          const deluluScore = lines.find(l => l.includes('Level'))?.match(/Level (\d)/)?.[1] || '1';
          const deluluDescription = {
            '1': "Pookie + 1 – You're on your way to having a Pookie",
            '2': "Situationship Final Boss – You talk most days but then they leave you on delivered for 6 hours",
            '3': "Brainrot Baddie – You've already stalked their Spotify, Venmo, and their Mom's Facebook from 2009",
            '4': "Wannabe Wifey – You've told your besties that you're getting married",
            '5': "Certified Delulu – You're the mayor of Deluluville"
          }[deluluScore];

          const probability = lines.find(l => l.includes('%'))?.match(/(\d+)%/)?.[1] || '0';

          return {
            url,
            delulu_score: parseInt(deluluScore),
            delulu_description: deluluDescription,
            summary: content,
            relationship_probability: parseInt(probability),
            advice: lines.slice(-1)[0] || "Keep manifesting, bestie!",
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

    return res.status(200).json({
      analyses: results,
      total_screenshots: screenshotUrls.length,
      successful_analyses: results.filter(r => !r.error).length
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
} 