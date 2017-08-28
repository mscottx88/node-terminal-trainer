const fs = require('fs');
const normalize = require('path').normalize;
const util = require('util');

const readFileAsync = util.promisify(fs.readFile);
const truncateAsync = util.promisify(fs.truncate);
const writeFileAsync = util.promisify(fs.writeFile);

const $defaultData = Symbol('default-data');
const $defaultExtension = Symbol('default-extension');
const $defaultFile = Symbol('default-file');
const $loaded = Symbol('loaded');
const $loadedPath = Symbol('loaded-path');

class Asset {
  constructor(
    {
      defaultData = {},
      defaultExtension = 'json',
      defaultFile = ''
    } = {}
  ) {
    Object.assign(this, {
      defaultData,
      defaultExtension,
      defaultFile
    });
  }

  get defaultData() {
    return this[$defaultData];
  }
  set defaultData(value) {
    this[$defaultData] = value;
  }

  get defaultExtension() {
    return this[$defaultExtension];
  }
  set defaultExtension(value) {
    this[$defaultExtension] = value;
  }

  get defaultFile() {
    return this[$defaultFile];
  }
  set defaultFile(value) {
    this[$defaultFile] = value;
  }

  get loaded() {
    return this[$loaded];
  }
  get loadedPath() {
    return this[$loadedPath];
  }

  async create(
    {
      data = this.defaultData,
      directory,
      extension = this.defaultExtension,
      file = this.defaultFile,
      name = `${file}.${extension}`.trimRight('.'),
      path = normalize(`${directory}/${name}`)
    } = {}
  ) {
    try {
      await truncateAsync(path);
    } catch (error) {
      // @todo handle specific errors
    }

    await writeFileAsync(path, JSON.stringify(data, undefined, 2), 'utf8');

    return {
      data,
      directory,
      extension,
      file,
      name,
      path
    };
  }

  async load(
    {
      directory,
      extension = this.defaultExtension,
      file = this.defaultFile,
      name = `${file}.${extension}`.trimRight('.'),
      path = normalize(`${directory}/${name}`)
    } = {}
  ) {
    const data = JSON.parse(await readFileAsync(path, 'utf8'));

    this[$loaded] = true;
    this[$loadedPath] = path;

    return {
      data,
      directory,
      extension,
      file,
      name,
      path
    };
  }

  async save(
    {
      data = this.defaultData,
      path = this.loadedPath
    } = {}
  ) {
    if (!this.loaded) {
      return;
    }

    await this.create({
      data,
      path
    });
  }
}

module.exports = {
  Asset
};
