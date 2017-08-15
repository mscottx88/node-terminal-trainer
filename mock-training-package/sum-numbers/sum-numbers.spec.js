const resolve = require('path').resolve;

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const _ = require('lodash');

chai.use(sinonChai);

const expect = require('chai').expect;

const path = resolve(process.argv.slice(-1)[0]);

describe('Sum Numbers', () => {
  let sandbox;

  beforeEach('stand up', () => {
    sandbox = sinon.sandbox.create();
  });

  afterEach('tear down', () => {
    sandbox.restore();
  });

  it('calculates the sum of an array of numbers', () => {
    const mod = require(path);

    function* randomNumbers(count, lo, hi) {
      let current = 0;
      while (current++ < count) {
        yield _.random(lo, hi);
      }
    }

    expect(mod.sum).to.be.a('function');

    const count = _.random(5, 20);
    let lo = _.random(-100, 100);
    let hi = _.random(-100, 100);

    if (hi < lo) {
      [hi, lo] = [lo, hi];
    }

    const numbers = [...randomNumbers(count, lo, hi)];
    const expected = _.sum(numbers);
    const actual = mod.sum(numbers);

    expect(actual).to.be.a('number').that.equals(expected);
  });
});
