       const http = require('http');
   const port = process.env.PORT || 3000;

   http.createServer((req, res) => {
     res.writeHead(200, { 'Content-Type': 'text/plain' });
     res.end('DeployX backend placeholder - Sharva will replace this with real API logic.');
   }).listen(port, () => {
     console.log('Backend placeholder listening on port ' + port);
   });