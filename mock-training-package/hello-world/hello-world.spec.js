const sinon = require('sinon');
const expect = require('chai').expect;
const resolve = require('path').resolve;

const path = resolve(process.argv.slice(-1)[0]);

describe('Hello World', () => {
  let sandbox;

  beforeEach('stand up', () => {
    sandbox = sinon.sandbox.create();
  });

  afterEach('tear down', () => {
    sandbox.restore();
  });

  it('uses console.log to print Hello World', () => {
    const logSpy = sandbox.spy(console, 'log');

    const mod = require(path);

    expect(logSpy.firstCall).to.be.ok;
    expect(logSpy.firstCall.calledWith('Hello World')).to.be.ok;
  });
});
