const http = require('http');

const data = JSON.stringify({
  id: "test",
  nome: "Test",
  whatsapp: "123456789",
  email: "test@test.com",
  cep: "12345678",
  endereco: "Rua Test",
  numero: "123",
  complemento: "",
  bairro: "Bairro Test",
  cidade: "Cidade Test",
  estado: "SP"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/contra-maus-tratos',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
