const testAnalyzeText = async () => {
  const testText = `
    Him: hey what are you up to?
    Me: nm just watching netflix hbu
    Him: same lol. wanna hang?
    Me: sure! what do you want to do?
    Him: we could watch a movie at my place
    Me: sounds good! what time?
    Him: 8pm work for you?
    Me: perfect! see you then 😊
    Him: can't wait 😏
  `;

  try {
    console.log('Testing analyze-text endpoint with new format...\n');
    const response = await fetch('http://localhost:3000/api/analyze-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: testText })
    });

    console.log('Response Status:', response.status);

    const data = await response.json();
    
    // Pretty print each section
    console.log('\n=== Delulu Score ===');
    console.log(`Score: ${data.delulu_score}`);
    console.log(`Description: ${data.delulu_description}`);
    
    console.log('\n=== What\'s Really Happening ===');
    console.log(data.whats_happening);
    
    console.log('\n=== Relationship Probability ===');
    console.log(`${data.relationship_probability}%`);
    
    console.log('\n=== Your Next Move ===');
    console.log(data.next_move);
    
    console.log('\n=== Full Response for Lovable Integration ===');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
};

testAnalyzeText(); 