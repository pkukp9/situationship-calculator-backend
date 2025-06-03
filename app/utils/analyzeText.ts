import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeText(text: string) {
  if (!text) {
    throw new Error("No text provided");
  }

  if (text.length < 40) {
    throw new Error("Text must be at least 40 characters long");
  }

  // Call OpenAI API
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a relationship analyzer. Respond only in valid JSON format."
      },
      {
        role: "user",
        content: `Analyze this conversation to give me: 1) A delulu score from 1-5 (1 = grounded, 5 = delusional about relationship potential), 2) A brief summary of the dynamic, 3) A relationship probability (0-100%), 4) Concrete advice for next steps. Respond in JSON format with fields: delulu_score, summary, relationship_probability, advice\n\nConversation: ${text}`
      }
    ],
    temperature: 0.7,
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }
  
  return JSON.parse(content);
} 