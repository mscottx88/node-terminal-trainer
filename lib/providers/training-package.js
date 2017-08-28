const Asset = require('./asset').Asset;
const parse = require('path').parse;

class TrainingPackage extends Asset {
  constructor(
    {
      defaultFile = 'root'
    } = {}
  ) {
    super({ defaultFile });
  }

  get exercises() {
    return this.package.exercises;
  }
  get exerciseTitles() {
    return this.package.exercises.map(({ title }) => title);
  }
  get exerciseNames() {
    return this.package.exercises.map(({ name }) => name);
  }
  get title() {
    return this.package.title;
  }

  async load(
    {
      directory,
      extension,
      file,
      name,
      path
    } = {}
  ) {
    let data;

    try {
      ({ data, directory, extension, file, name, path } = await super.load({ directory, extension, file, name, path }));
    } catch (error) {
      // @todo use error module
      throw new Error({ code: 'invalid-package-folder', message: 'This folder does not appear to be a valid training package.' });
    }

    this.validatePackage(data);

    if (!directory) {
      this.directory = parse(path).dir;
    } else {
      this.directory = directory;
    }

    this.name = name;
    this.path = path;
    this.package = data;

    return this.package;
  }

  validatePackage() { }
}

module.exports = {
  TrainingPackage
};
