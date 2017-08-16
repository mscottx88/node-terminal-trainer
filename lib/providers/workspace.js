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
  Object.defineProperty(this, 'currentExercise', {
    get: () => this.currentTrainingPackage ? this.currentTrainingPackage.currentExercise : undefined
  });

  Object.defineProperty(this, 'currentExercises', {
    get: () => this.currentTrainingPackage && !this.isEmpty() ? this.trainingPackages[this.currentTrainingPackage.name].exercises : []
  });

  Object.defineProperty(this, 'currentTrainingPackage', {
    get: () => this.workspace.currentTrainingPackage
  });

  Object.defineProperty(this, 'currentTrainingPackageRows', {
    get: () => {
      const rows = [['Title', 'Completed']];

      if (!this.currentTrainingPackage) {
        return rows;
      }

      return rows.concat(
        this.trainingPackages[this.currentTrainingPackage.name].exercises.map(
          ({ completed, title }) => [title, completed ? `{green-fg}{bold}${!!completed}{/}` : `{red-fg}{bold}${!!completed}{/}`]
        )
      );
    }
  });

  Object.defineProperty(this, 'defaultWorkspace', {
    get: () => DEFAULT_WORKSPACE
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
        title,
        exercises
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
    title,
    exercises: []
  };

  const package = this.workspace.trainingPackages[path];
  for (const { name, title } of exercises) {
    package.exercises.push({
      name,
      title,
      completed: false
    });
  }

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

  this.workspace = parsed;
  this.loadedPath = path;
  this.loaded = true;

  return this.workspace;
}

Workspace.prototype.save = async function (
  {
    path = this.loadedPath
  } = {}
) {
  if (!this.loaded) {
    return;
  }

  await this.create({
    path,
    workspace: this.workspace
  });
}

Workspace.prototype.getNextIncompleteExercise = function (
  {
    relative = -1
  }
) {
  const exercises = this.currentExercises;
  for (let index = relative + 1; index < exercises.length; index++) {
    if (!exercises[index].completed) {
      return index;
    }
  }

  return relative;
}

Workspace.prototype.failCurrentExercise = function () { }

Workspace.prototype.passCurrentExercise = function () {
  this.currentExercises[this.currentExercise].completed = true;
}

Workspace.prototype.setCurrentExercise = function (
  {
    index
  } = {}
) {
  if (!this.workspace.currentTrainingPackage) {
    // @todo use error module
    throw new Error({ code: 'training-package-not-set' });
  }

  this.workspace.currentTrainingPackage.currentExercise = index;
}

Workspace.prototype.isCurrentTrainingPackageComplete = function () {
  const exercises = this.currentExercises;
  for (const exercise of exercises) {
    if (!exercise.completed) {
      return false;
    }
  }
  return true;
}

Workspace.prototype.setCurrentTrainingPackage = function (
  {
    trainingPackage
  } = {}
) {
  if (!this.workspace.currentTrainingPackage) {
    this.workspace.currentTrainingPackage = {};
  }
  this.workspace.currentTrainingPackage.name = trainingPackage.path;
}

Workspace.prototype.validateWorkspace = function (workspace) {
  // @todo this
}

module.exports = {
  Workspace
};
