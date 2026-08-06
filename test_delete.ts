import fetch from 'node-fetch';
async function run() {
  const res = await fetch('http://localhost:3000/api/jogo/users/17860514251584s1stn3', { method: 'DELETE' });
  console.log(res.status, await res.text());
}
run();
