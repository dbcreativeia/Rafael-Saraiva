const test1 = "Sã£o Paulo";
const test2 = "SÃ£o Paulo";
const test3 = "S. B. do Campo";

const normalize = (str) => {
  let norm = str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Remove all non-alphanumeric/space characters (this drops £, ?, etc)
  norm = norm.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
  return norm;
}

console.log(normalize(test1));
console.log(normalize(test2));
console.log(normalize(test3));
