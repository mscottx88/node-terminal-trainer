const blessed = require('blessed');
const TabView = require('./tab-view').TabView;

const FileExplorer = require('./file-explorer').FileExplorer;

const TrainingPackage = require('../providers/training-package').TrainingPackage;
const TrainingPackageExplorer = require('./training-package-explorer').TrainingPackageExplorer;

function WorkspaceExplorer(
  {
    mainContainer,
    scnMain,
    workspace
  } = {}
) {
  TabView.call(this, {
    scnMain,
    parent: mainContainer,
    name: 'workspaceRoot',
    label: ' Workspace Explorer '
  })

  Object.assign(this, { mainContainer, scnMain, workspace });

  const options = {
    chooseFolderOnly: true,
    title: ' Choose Training Package Folder '
  };
  this.trainingPackageChooser = new FileExplorer(Object.assign(options, this));

  this.trainingPackage = new TrainingPackage(this);
  this.trainingPackageExplorer = new TrainingPackageExplorer(this);

  this.construct();
}

WorkspaceExplorer.prototype = Object.create(TabView.prototype);

WorkspaceExplorer.prototype.defineScreenElements = function () {
  const isEmpty = this.workspace.isEmpty();
  let top = 0;

  this.addScreenElement({
    definition: {
      width: '35%',
      label: ' Resume ',
      padding: {
        left: 1,
        right: 1
      },
      hidden: isEmpty
    },
    focusable: false,
    name: 'pnlResume',
    type: 'Box'
  });

  this.addScreenElement({
    definition: {
      height: 3,
      content: 'Where I Left Off',
      align: 'center',
      hidden: isEmpty
    },
    name: 'btnResume',
    parent: this.pnlResume,
    type: 'Button'
  });

  top += 3;

  this.addScreenElement({
    definition: {
      keys: true,
      interactive: true,
      invertSelected: true,
      tags: true,
      noCellBorders: true,
      align: 'left',
      height: '100%-5',
      width: '100%-4',
      top,
      label: ' More ',
      padding: {
        left: 1,
        right: 1
      },
      hidden: isEmpty
    },
    name: 'lstResumeTrainingPackages',
    parent: this.pnlResume,
    scrollable: true,
    type: 'ListTable'
  });

  this.addScreenElement({
    definition: {
      width: '35%',
      left: '35%',
      label: ' Maintain ',
      padding: {
        left: 1,
        right: 1
      }
    },
    focusable: false,
    name: 'pnlMaintain',
    type: 'Box'
  });

  this.addScreenElement({
    definition: {
      height: 3,
      content: 'Import Training Package',
      align: 'center'
    },
    name: 'btnImport',
    parent: this.pnlMaintain,
    type: 'Button'
  });
}

WorkspaceExplorer.prototype.defineEventHandlers = function () {
  this.btnImport.on('press', this.btnImport_onPress.bind(this));
  this.btnResume.on('press', this.btnResume_onPress.bind(this));
  this.lstResumeTrainingPackages.on('select', this.lstResumeTrainingPackages_onSelect.bind(this));
  this.pnlResume.on('show', this.pnlResume_onShow.bind(this));
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
    const path = name || this.lstResumeTrainingPackages.data.keys[index - 1];
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

WorkspaceExplorer.prototype.pnlResume_onShow = function () {
  this.btnResume.show();
  this.lstResumeTrainingPackages.show();
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
        this.pnlResume.show();
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
  this.btnResume.focus();
  this.scnMain.saveFocus();
  this.scnMain.render();
}

WorkspaceExplorer.prototype.refreshTrainingPackages = function () {
  this.lstResumeTrainingPackages.setRows(this.workspace.trainingPackageProgress);
  this.lstResumeTrainingPackages.data.keys = Object.keys(this.workspace.trainingPackages);
}

WorkspaceExplorer.prototype.show = function () {
  this.refreshTrainingPackages();

  TabView.prototype.show.call(this);
}

module.exports = {
  WorkspaceExplorer
};
