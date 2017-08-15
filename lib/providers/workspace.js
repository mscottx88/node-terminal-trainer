const fs = require('fs');
const normalize = require('path').normalize;
const util = require('util');
const _ = require('lodash');

const readFileAsync = util.promisify(fs.readFile);
const truncateAsync = util.promisify(fs.truncate);
const writeFileAsync = util.promisify(fs.writeFile);

const DEFAULT_WORKSPACE = {};

const DEFAULT_WORKSPACE_EXTENSION = 'json';
const DEFAULT_WORKSPACE_FILE = 'workspace';

function Workspace(
  {
  } = {}
) {
  Object.defineProperty(this, 'defaultWorkspace', {
    get: () => {
      return DEFAULT_WORKSPACE;
    }
  });

  Object.defineProperty(this, 'trainingPackages', {
    get: () => {
      if (this.isEmpty()) {
        return [];
      }

      return this.workspace.trainingPackages;
    }
  });

  Object.defineProperty(this, 'trainingPackageTitles', {
    get: () => {
      if (this.isEmpty()) {
        return [];
      }

      return _.map(this.workspace.trainingPackages, ({ title }, key) => title);
    }
  });
}

Workspace.prototype.addTrainingPackage = function (
  {
    trainingPackage: {
      path,
      package: {
        name,
        title
      }
    }
  } = {}
) {
  if (!this.workspace) {
    throw new Error('Workspace not yet loaded');
  }

  if (!this.workspace.trainingPackages) {
    this.workspace.trainingPackages = {};
  }

  // this is where metadata will be stored
  this.workspace.trainingPackages[path] = {
    name,
    title
  };

  this.save();
}

Workspace.prototype.create = async function (
  {
    directory,
    extension = DEFAULT_WORKSPACE_EXTENSION,
    file = DEFAULT_WORKSPACE_FILE,
    name = `${file}.${extension}`.trimRight('.'),
    path = normalize(`${directory}/${name}`),
    workspace = this.defaultWorkspace
  }
) {
  try {
    try {
      await truncateAsync(path);
    } catch (error) {
      // @todo handle specific errors
    }

    await writeFileAsync(path, JSON.stringify(workspace, undefined, 2), 'utf8');

    return workspace;
  } catch (error) {
    // @todo handle specific errors
    throw error;
  }
}

Workspace.prototype.isEmpty = function () {
  return !this.workspace
    || !this.workspace.trainingPackages
    || Object.keys(this.workspace.trainingPackages) === 0;
}

Workspace.prototype.load = async function (
  {
    directory,
    extension = DEFAULT_WORKSPACE_EXTENSION,
    file = DEFAULT_WORKSPACE_FILE,
    name = `${file}.${extension}`.trimRight('.'),
    path = normalize(`${directory}/${name}`),
  } = {}
) {
  let contents;
  let parsed;

  try {
    contents = await readFileAsync(path, 'utf8');
    parsed = JSON.parse(contents);
  } catch (error) {
    // @todo use error module
    throw new Error({ code: 'invalid-workspace-folder', message: 'This folder does not appear to be a valid workspace.' });
  }

  this.validateWorkspace(parsed);

  // @todo convert to load all packages in the strings
  // could also just load a training package on demand
  this.workspace = parsed;
  this.loadedPath = path;

  return this.workspace;
}

Workspace.prototype.save = async function (
  {
    path = this.loadedPath
  } = {}
) {
  this.create({
    path,
    workspace: this.workspace
  });
}

Workspace.prototype.validateWorkspace = function (workspace) {
  // @todo this
}

module.exports = {
  Workspace
};
