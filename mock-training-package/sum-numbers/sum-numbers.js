function sum(numbers) {
  let total = 0;

  for (const number of numbers) {
    total += number;
  }

  return total;
}

module.exports = {
  sum
};
