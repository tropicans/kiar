const jwt = require('jsonwebtoken');
const token = jwt.sign({ email: 'test@example.com', _forceAdmin: true }, 'secret', { expiresIn: '1h' });
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/bus-passengers/bis1',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('HTTP', res.statusCode, data.substring(0, 500) + '...'));
});
req.on('error', console.error);
req.end();
