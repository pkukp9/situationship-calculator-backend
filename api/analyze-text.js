const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Ope! You forgot to spill the tea (no text provided)" });
    }

    if (text.length < 40) {
      return res.status(400).json({ error: "Ope! We need more tea (at least 40 characters)" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a relationship analyzer combining Paul Graham's concise, action-oriented writing with Carrie Bradshaw's wit and relationship insights. Your analysis should be:

1. Direct and specific - no vague advice
2. Action-oriented - clear next steps
3. Backed by behavioral evidence
4. Witty but practical
5. Focused on patterns and red/green flags

When calculating relationship probability:
- Commitment indicators (exclusivity, meeting friends/family) +20-30%
- Consistent communication and follow-through +15-25%
- Future planning together +10-20%
- Emotional availability and vulnerability +10-20%
- Mixed signals or inconsistency -15-25%
- One-sided effort -20-30%
- Lack of progression over time -10-20%

Base probability starts at 50% and adjusts based on these factors.`
        },
        {
          role: "user",
          content: `Analyze this conversation and provide:

1. DELULU SCORE (1-5) with matching description:
   - Level 1: "Pookie + 1 – You're on your way to having a Pookie"
   - Level 2: "Situationship Final Boss – You talk most days but then they leave you on delivered for 6 hours"
   - Level 3: "Brainrot Baddie – You've already stalked their Spotify, Venmo, and their Mom's Facebook from 2009"
   - Level 4: "Wannabe Wifey – You've told your besties that you're getting married"
   - Level 5: "Certified Delulu – You're the mayor of Deluluville"

2. ANALYSIS:
   - Specific behaviors and patterns observed
   - Power dynamics and effort balance
   - Red/green flags
   - Current relationship stage evidence

3. RELATIONSHIP PROBABILITY (0-100%):
   Calculate based on the scoring factors in system prompt.
   Explain which factors influenced the score.

4. STRATEGIC ADVICE:
   - Specific actions to take (or avoid)
   - Timeline for next steps
   - Clear boundaries to set
   - How to maintain power balance
   
Write like Paul Graham meets Carrie Bradshaw - clear, witty, and actionable.
Example style: "He's showing boyfriend behavior without the boyfriend label. Text him less. Make plans with friends this weekend. If he wants you, he'll make it official."

Here's the conversation: ${text}`
        }
      ],
    });

    const response = completion.choices[0].message.content;
    
    // Split into main sections and clean up
    const sections = response
      .split(/\d\.\s+/)
      .filter(Boolean)
      .map(section => section.trim());
    
    // Extract delulu score from first section
    const deluluMatch = sections[0]?.match(/Level (\d)|Score: (\d)/);
    const deluluScore = deluluMatch ? (deluluMatch[1] || deluluMatch[2]) : '1';
    const deluluDescription = {
      '1': "Pookie + 1 – You're on your way to having a Pookie",
      '2': "Situationship Final Boss – You talk most days but then they leave you on delivered for 6 hours",
      '3': "Brainrot Baddie – You've already stalked their Spotify, Venmo, and their Mom's Facebook from 2009",
      '4': "Wannabe Wifey – You've told your besties that you're getting married",
      '5': "Certified Delulu – You're the mayor of Deluluville"
    }[deluluScore];

    // Extract analysis from second section
    const whatsHappening = sections[1]
      ?.replace(/^(ANALYSIS:|Analysis:|Detailed Analysis:)/i, '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n')
      .trim() || '';
    
    // Extract probability from third section
    const probabilityText = sections[2] || '';
    const probabilityMatch = probabilityText.match(/(\d+)%/);
    const probability = probabilityMatch ? probabilityMatch[1] : '0';
    
    // Extract advice from fourth section
    const nextMove = sections[3]
      ?.replace(/^(STRATEGIC ADVICE:|Strategic Advice:|Advice:)/i, '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n')
      .trim() || '';
    
    return res.status(200).json({
      delulu_score: parseInt(deluluScore),
      delulu_description: deluluDescription,
      whats_happening: whatsHappening,
      relationship_probability: parseInt(probability),
      next_move: nextMove
    });
  } catch (error) {
    console.error('Error analyzing text:', error);
    return res.status(500).json({ error: "Ope! Something went wrong analyzing your situation" });
  }
}; 