const testDeployedAPI = async () => {
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
    console.log('Testing deployed API...');
    const response = await fetch('https://situationship-calculator.vercel.app/api/analyze-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: testText })
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers));

    if (!response.ok) {
      const text = await response.text();
      console.log('Error Response:', text);
      return;
    }

    const data = await response.json();
    console.log('\nAPI Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
};

// Test screenshot endpoint
const testDeployedScreenshotAPI = async () => {
  const testImage = 'https://example.com/path-to-test-image.jpg'; // Replace with a real image URL

  try {
    console.log('\nTesting deployed screenshot API...');
    const response = await fetch('https://situationship-calculator.vercel.app/api/analyze-screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: testImage })
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers));

    if (!response.ok) {
      const text = await response.text();
      console.log('Error Response:', text);
      return;
    }

    const data = await response.json();
    console.log('\nAPI Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
};

// Run tests
console.log('Starting API tests...\n');
testDeployedAPI(); 