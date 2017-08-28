const Asset = require('./asset').Asset;
const _ = require('lodash');

const DEFAULT_WORKSPACE = {};

class Workspace extends Asset {
  constructor(
    {
      defaultFile = 'workspace'
    } = {}
  ) {
    super({ defaultData: DEFAULT_WORKSPACE, defaultFile });
  }

  get currentExercise() {
    return this.currentTrainingPackage ? this.currentTrainingPackage.currentExercise : undefined;
  }
  get currentExercises() {
    return this.currentTrainingPackage && !this.isEmpty() ? this.trainingPackages[this.currentTrainingPackage.name].exercises : [];
  }
  get currentTrainingPackage() {
    return this.workspace.currentTrainingPackage;
  }

  get currentTrainingPackageView() {
    const view = {
      align: ['left', 'left'],
      rows: [['Title', 'Completed']]
    };

    if (!this.currentTrainingPackage) {
      return view;
    }

    view.rows.push(
      ...this.trainingPackages[this.currentTrainingPackage.name].exercises.map(
        ({ completed, title }) => [title, completed ? `{green-fg}{bold}${!!completed}{/}` : `{red-fg}{bold}${!!completed}{/}`]
      )
    );

    return view;
  }

  get defaultWorkspace() {
    return DEFAULT_WORKSPACE;
  }
  get trainingPackages() {
    return this.isEmpty() ? [] : this.workspace.trainingPackages;
  }
  get trainingPackageTitles() {
    return _.map(this.trainingPackages, ({ title }) => title);
  }

  get trainingPackageView() {
    const view = {
      align: ['left', 'right', 'right', 'right', 'right'],
      rows: [['Title', 'No. Exercises', 'Completed', 'Incomplete', 'Completion']]
    };

    if (this.isEmpty()) {
      return view;
    }

    view.rows.push(
      ..._.map(this.trainingPackages,
        (
          {
            exercises,
            title
          }
        ) => {
          const totalExercises = exercises.length;
          const totalComplete = exercises.filter(({ completed }) => completed).length;
          const totalIncomplete = totalExercises - totalComplete;
          const completionPercent = `${(totalComplete / totalExercises) * 100}%`;

          return [
            title,
            totalExercises,
            totalComplete,
            totalIncomplete,
            completionPercent
          ];
        }
      )
    );

    return view;
  }

  addTrainingPackage(
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

    const contents = this.workspace.trainingPackages[path];
    for (const { name, title } of exercises) {
      contents.exercises.push({
        name,
        title,
        completed: false
      });
    }

    this.save();
  }

  failCurrentExercise() { }

  getPreference(
    {
      name,
      defaultValue
    } = {}
  ) {
    if (!this.workspace.preference || this.workspace.preference[name] === undefined) {
      return defaultValue;
    }

    return this.workspace.preference[name];
  }

  getNextIncompleteExercise(
    {
      relative = -1
    } = {}
  ) {
    const exercises = this.currentExercises;
    for (let index = relative + 1; index < exercises.length; index++) {
      if (!exercises[index].completed) {
        return index;
      }
    }
    return relative;
  }

  isCurrentTrainingPackageComplete() {
    const exercises = this.currentExercises;
    for (const exercise of exercises) {
      if (!exercise.completed) {
        return false;
      }
    }
    return true;
  }

  isEmpty() {
    return !this.workspace
      || !this.workspace.trainingPackages
      || Object.keys(this.workspace.trainingPackages) === 0;
  }

  async load(
    {
      directory,
      extension,
      file,
      name,
      path
    }
  ) {
    let data;

    try {
      ({ data, directory, extension, file, name, path } = await super.load({ directory, extension, file, name, path }));
    } catch (error) {
      // @todo use error module
      throw new Error({ code: 'invalid-workspace-folder', message: 'This folder does not appear to be a valid workspace.' });
    }

    this.validateWorkspace(data);
    this.workspace = data;

    return this.workspace;
  }

  passCurrentExercise() {
    this.currentExercises[this.currentExercise].completed = true;
  }

  async save(
    {
      path
    } = {}
  ) {
    await super.save({ data: this.workspace });
  }

  setCurrentExercise(
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

  setCurrentTrainingPackage(
    {
      trainingPackage
    } = {}
  ) {
    if (!this.workspace.currentTrainingPackage) {
      this.workspace.currentTrainingPackage = {};
    }
    this.workspace.currentTrainingPackage.name = trainingPackage.path;
  }

  setPreference(
    {
      name,
      value
    } = {}
  ) {
    if (!this.workspace.preference) {
      this.workspace.preference = {};
    }

    this.workspace.preference[name] = value;
  }

  validateWorkspace() { }
}

module.exports = {
  Workspace
};
