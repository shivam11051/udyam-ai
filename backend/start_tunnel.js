const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

(async () => {
  const tunnel = await localtunnel({ port: 5001 });

  console.log('Tunnel started at:', tunnel.url);

  // Update .env file in the frontend (root directory)
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace or add REACT_APP_BACKEND_URL
  if (envContent.includes('REACT_APP_BACKEND_URL=')) {
    envContent = envContent.replace(/REACT_APP_BACKEND_URL=.*/g, `REACT_APP_BACKEND_URL=${tunnel.url}`);
  } else {
    envContent += `\nREACT_APP_BACKEND_URL=${tunnel.url}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('Updated .env with new backend URL');

  tunnel.on('close', () => {
    console.log('Tunnel closed');
  });
})();
