const fs = require('fs');
const normalize = require('path').normalize;
const parse = require('path').parse;
const util = require('util');

const readFileAsync = util.promisify(fs.readFile);

const DEFAULT_TRAINING_PACKAGE_EXTENSION = 'json';
const DEFAULT_TRAINING_PACKAGE_FILE = 'root';

function TrainingPackage(
  {
  } = {}
) {
  Object.defineProperty(this, 'exercises', {
    get: () => this.package.exercises
  });

  Object.defineProperty(this, 'exerciseTitles', {
    get: () => this.package.exercises.map(({ title }) => title)
  });

  Object.defineProperty(this, 'exerciseNames', {
    get: () => this.package.exercises.map(({ name }) => name)
  });

  Object.defineProperty(this, 'title', {
    get: () => this.package.title
  });
}

TrainingPackage.prototype.load = async function (
  {
    directory,
    extension = DEFAULT_TRAINING_PACKAGE_EXTENSION,
    file = DEFAULT_TRAINING_PACKAGE_FILE,
    name = `${file}.${extension}`.trimRight('.'),
    path = normalize(`${directory}/${name}`)
  }
) {
  let contents;
  let package;

  try {
    contents = await readFileAsync(path, 'utf8');
    package = JSON.parse(contents);
  } catch (error) {
    // @todo use error module
    throw new Error({ code: 'invalid-package-folder', message: 'This folder does not appear to be a valid training package.' });
  }

  this.validatePackage(package);

  if (!directory) {
    this.directory = parse(path).dir;
  } else {
    this.directory = directory;
  }

  this.name = name;
  this.path = path;
  this.package = package;
}

TrainingPackage.prototype.validatePackage = function (package) {
  // @todo this
}

module.exports = {
  TrainingPackage
};
