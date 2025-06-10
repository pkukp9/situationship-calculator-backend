const http = require('http');

// Test URLs - using publicly accessible images
const screenshotUrls = [
  'https://i.imgur.com/example1.jpg',  // Replace with real image URLs
  'https://i.imgur.com/example2.jpg'   // Replace with real image URLs
];

const requestData = JSON.stringify({
  screenshotUrls
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/analyze-screenshot',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestData)
  }
};

console.log('Sending request with URLs:', screenshotUrls);

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const response = JSON.parse(data);
    console.log('\nResponse Summary:');
    console.log('Total Screenshots:', response.total_screenshots);
    console.log('Successful Analyses:', response.successful_analyses);
    
    if (response.analyses) {
      console.log('\nAnalyses:');
      response.analyses.forEach((analysis, index) => {
        console.log(`\nScreenshot ${index + 1}:`);
        if (analysis.error) {
          console.log('Error:', analysis.error);
        } else {
          console.log('URL:', analysis.url);
          console.log('Delulu Score:', analysis.delulu_score);
          console.log('Description:', analysis.delulu_description);
          console.log('Probability:', analysis.relationship_probability + '%');
          console.log('Advice:', analysis.advice);
        }
      });
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(requestData);
req.end(); 