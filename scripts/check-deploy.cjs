const https = require('https');
https.get('https://duozh08.github.io/chipspec-db/', (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    const js = [...data.matchAll(/assets\/index-[A-Za-z0-9_-]+\.js/g)].map((m) => m[0]);
    console.log('HTTP', res.statusCode, '| JS:', js.join(', '));
  });
}).on('error', (e) => console.error('ERR', e.message));
