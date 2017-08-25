const blessed = require('blessed');
const TabView = require('./tab-view').TabView;

const FileExplorer = require('./file-explorer').FileExplorer;

const TrainingPackage = require('../providers/training-package').TrainingPackage;
const TrainingPackageExplorer = require('./training-package-explorer').TrainingPackageExplorer;

const WorkspaceExplorerTutorial = require('./workspace-explorer-tutorial').WorkspaceExplorerTutorial;

function WorkspaceExplorer(
  {
    mainContainer = this.mainContainer,
    scnMain = this.scnMain,
    workspace = this.workspace
  } = {}
) {
  Object.assign(this, { mainContainer, scnMain, workspace });

  TabView.call(this, {
    name: 'workspaceRoot',
    label: ' Workspace Explorer '
  });

  const options = {
    chooseFolderOnly: true,
    title: ' Choose Training Package Folder '
  };
  this.trainingPackageChooser = new FileExplorer(Object.assign(options, this));

  this.trainingPackage = new TrainingPackage(this);
  this.trainingPackageExplorer = new TrainingPackageExplorer(this);

  this.workspaceExplorerTutorial = new WorkspaceExplorerTutorial(this);

  this.construct();
}

WorkspaceExplorer.prototype = Object.create(TabView.prototype);

WorkspaceExplorer.prototype.defineScreenElements = function () {
  this.addScreenElement({
    definition: {
      height: 3,
      content: 'Continue From Where I Left Off',
      align: 'center',
      hidden: !this.workspace.currentTrainingPackage
    },
    helpLines: [
      'Use this shortcut to {bold}Continue{/} where you left off previously.',
      'Press the {white-fg}{bold}ENTER{/} key or the {white-fg}{bold}SPACEBAR{/} key to resume.',
      'Press the {white-fg}{bold}TAB{/} key to change the {blue-bg}{white-fg}focus{/}.  Press ' +
      'the {white-fg}{bold}ESCAPE{/} key to go back.'
    ],
    name: 'btnResume',
    type: 'Button'
  });

  this.addScreenElement({
    definition: {
      hidden: this.workspace.isEmpty(),
      label: ' Open Training Package '
    },
    helpLines: [
      'This is the list of {bold}Training Packages{/} in your {bold}Workspace{/}.',
      'Press the {white-fg}{bold}ENTER{/} key or the {white-fg}{bold}SPACEBAR{/} key to open ' +
      'the currently selected {bold}Training Package{/}.',
      'Press the {white-fg}{bold}UP{/} and {white-fg}{bold}DOWN{/} keys to change your {blue-bg}{white-fg}selection{/}.',
      'Press the {white-fg}{bold}TAB{/} key to change the {blue-bg}{white-fg}focus{/}.  Press ' +
      'the {white-fg}{bold}ESCAPE{/} key to go back.'
    ],
    name: 'lstResumeTrainingPackages',
    scrollable: true,
    type: 'ColumnList'
  });

  this.addScreenElement({
    definition: {
      height: 3,
      content: 'Import Training Package',
      align: 'center'
    },
    helpLines: [
      'Use this button to add new {bold}Training Packages{/} to your {bold}Workspace{/}.',
      'Press the {white-fg}{bold}ENTER{/} key or the {white-fg}{bold}SPACEBAR{/} key to import ' +
      'a new {bold}Training Package{/}.',
      'Press the {white-fg}{bold}TAB{/} key to change the {blue-bg}{white-fg}focus{/}.  Press ' +
      'the {white-fg}{bold}ESCAPE{/} key to go back.'
    ],
    name: 'btnImport',
    type: 'Button'
  });
}

WorkspaceExplorer.prototype.defineEventHandlers = function () {
  this.btnImport.on('press', this.btnImport_onPress.bind(this));
  this.btnResume.on('press', this.btnResume_onPress.bind(this));
  this.lstResumeTrainingPackages.on('show', this.lstResumeTrainingPackages_onShow.bind(this));
  this.lstResumeTrainingPackages.on('select', this.lstResumeTrainingPackages_onSelect.bind(this));
  this.trainingPackageChooser.on('accept', this.trainingPackageChooser_onAccept.bind(this));
  this.trainingPackageExplorer.on('hide', this.trainingPackageExplorer_onHide.bind(this));
}

WorkspaceExplorer.prototype.construct = function () {
  this.defineScreenElements();
  this.defineEventHandlers();
}

WorkspaceExplorer.prototype.btnImport_onPress = function () {
  this.trainingPackageChooser.show();
}

WorkspaceExplorer.prototype.btnResume_onPress = async function () {
  await this.lstResumeTrainingPackages_onSelect(null, null, this.workspace.currentTrainingPackage.name);
}

WorkspaceExplorer.prototype.lstResumeTrainingPackages_onSelect = async function (item, index, name) {
  try {
    const path = name || this.lstResumeTrainingPackages.data.keys[index];
    await this.trainingPackage.load({ path });

    this.trainingPackageExplorer.show();

    this.trainingPackageExplorer.setTrainingPackage({
      currentExercise: this.workspace.currentExercise,
      trainingPackage: this.trainingPackage
    });
  } catch (error) {
    switch (error.code) {
      case 'invalid-package-folder':
        // @todo display popup / message
        break;
    }
  }
}

WorkspaceExplorer.prototype.layoutElements = function () {
  let top = 0;

  if (this.workspace.currentTrainingPackage) {
    this.btnResume.top = top;
    this.btnResume.hidden = false;

    top += this.btnResume.height;
  }

  this.lstResumeTrainingPackages.width = this.internalWidth;
  if (this.btnResume.hidden) {
    this.lstResumeTrainingPackages.top = top;
    this.lstResumeTrainingPackages.height = this.internalHeight - this.btnImport.height;
  } else {
    this.lstResumeTrainingPackages.top = top;
    this.lstResumeTrainingPackages.height = this.internalHeight - this.btnResume.height - this.btnImport.height;
  }

  if (this.lstResumeTrainingPackages.hidden) {
    this.btnImport.top = top;
  } else {
    this.btnImport.top = this.internalHeight - this.btnImport.height;
  }
}

WorkspaceExplorer.prototype.lstResumeTrainingPackages_onShow = function () {
  this.layoutElements();
}

WorkspaceExplorer.prototype.trainingPackageChooser_onAccept = async function (directory) {
  try {
    await this.trainingPackage.load({ directory });
    this.trainingPackageChooser.hide();

    const wasEmpty = this.workspace.isEmpty();

    this.workspace.addTrainingPackage({
      trainingPackage: this.trainingPackage
    });

    this.refreshTrainingPackages();

    if (!this.workspace.isEmpty()) {
      if (wasEmpty) {
        this.lstResumeTrainingPackages.show();
        this.lstResumeTrainingPackages.focus();
      }
    }

    this.scnMain.render();
  } catch (error) {
    switch (error.code) {
      case 'invalid-package-folder':
        // @todo display popup / message
        break;
    }
  }
}

WorkspaceExplorer.prototype.trainingPackageExplorer_onHide = function () {
  this.refreshTrainingPackages();
  this.layoutElements();

  if (this.workspace.currentTrainingPackage) {
    this.btnResume.focus();
  } else {
    this.focusFirst();
  }

  this.scnMain.saveFocus();
  this.scnMain.render();
}

WorkspaceExplorer.prototype.refreshTrainingPackages = function () {
  this.lstResumeTrainingPackages.setRows(this.workspace.trainingPackageView);
  this.lstResumeTrainingPackages.data.keys = Object.keys(this.workspace.trainingPackages);
}

WorkspaceExplorer.prototype.show = function () {
  this.refreshTrainingPackages();
  this.layoutElements();

  TabView.prototype.show.call(this);

  if (!this.tutorialAutoShown) {
    this.tutorialAutoShown = true;
    if (this.workspace.getPreference({ name: 'showTutorial', defaultValue: true })) {
      this.workspaceExplorerTutorial.show();
    }
  }
}

module.exports = {
  WorkspaceExplorer
};
