const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

module.exports = async (req, res) => {
  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse JSON body for Vercel serverless functions
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  try {
    const { screenshot, mimeType } = req.body;

    if (!screenshot) {
      return res.status(400).json({ error: "Bestie, we need a screenshot to analyze!" });
    }

    if (!mimeType || !mimeType.startsWith('image/')) {
      return res.status(400).json({ error: "Invalid image format!" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: "You are a witty relationship analyzer with the combined personality of Carrie Bradshaw's wit and Samantha Jones' boldness from Sex and the City. Analyze conversation screenshots and provide insights about relationship dynamics."
        },
        {
          role: "user",
          content: [
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
            },
            {
              type: "image_url",
              image_url: screenshot
            }
          ]
        }
      ],
      max_tokens: 1000,
    });

    const response = completion.choices[0].message.content;
    const lines = response?.split('\n') || [];
    const deluluScore = lines.find(l => l.includes('Level'))?.match(/Level (\d)/)?.[1] || '1';
    const deluluDescription = {
      '1': "Pookie + 1 – You're on your way to having a Pookie",
      '2': "Situationship Final Boss – You talk most days but then they leave you on delivered for 6 hours",
      '3': "Brainrot Baddie – You've already stalked their Spotify, Venmo, and their Mom's Facebook from 2009",
      '4': "Wannabe Wifey – You've told your besties that you're getting married",
      '5': "Certified Delulu – You're the mayor of Deluluville"
    }[deluluScore];

    const probability = lines.find(l => l.includes('%'))?.match(/(\d+)%/)?.[1] || '0';
    
    return res.status(200).json({
      delulu_score: parseInt(deluluScore),
      delulu_description: deluluDescription,
      summary: response,
      relationship_probability: parseInt(probability),
      advice: lines.slice(-1)[0] || "Keep manifesting, bestie!"
    });
  } catch (error) {
    console.error('Error processing screenshot:', error);
    return res.status(500).json({ error: "Ope! Something went wrong analyzing your situation" });
  }
}; 