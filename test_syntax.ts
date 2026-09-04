const res = [[{a: 1}], []];
const [[popup]] = res;
console.log(popup);

const res2 = [[[]]];
const [[popup2]] = res2 as any;
console.log(popup2);

