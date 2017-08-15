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

  this.construct();
}

WorkspaceExplorer.prototype = Object.create(TabView.prototype);

WorkspaceExplorer.prototype.defineScreenElements = function () {
  let top = 0;

  this.pnlResume = blessed.box({
    screen: this.scnMain,
    parent: this.sdiRoot,
    name: 'pnlResume',
    width: '35%',
    border: 'line',
    style: {
      border: {
        fg: 'white'
      }
    },
    label: ' Resume ',
    padding: {
      left: 1,
      right: 1
    }
  });

  this.btnResume = blessed.button({
    screen: this.scnMain,
    parent: this.pnlResume,
    height: 3,
    name: 'btnResume',
    content: 'Where I Left Off',
    align: 'center',
    style: {
      fg: 'black',
      bg: 'white',
      focus: {
        bg: 'blue',
        fg: 'white',
        border: {
          fg: 'blue'
        }
      },
      border: {
        fg: 'white'
      }
    },
    border: 'line',
    tabIndex: 0
  });

  top += 3;

  this.lstResumeTrainingPackages = blessed.list({
    screen: this.scnMain,
    parent: this.pnlResume,
    name: 'lstResumeTrainingPackages',
    keys: true,
    interactive: true,
    invertSelected: true,
    scrollable: true,
    tags: true,
    style: {
      selected: {
        bg: 'white',
        fg: 'black'
      },
      border: {
        fg: 'white'
      },
      focus: {
        border: {
          fg: 'blue'
        },
        selected: {
          bg: 'blue',
          fg: 'white'
        }
      }
    },
    scrollbar: {
      style: {
        fg: 'white',
        inverse: true
      },
      track: {
        ch: ':',
        fg: 'blue'
      }
    },
    top,
    border: 'line',
    label: ' More ',
    padding: {
      left: 1
    },
    tabIndex: this.workspace.isEmpty() ? -1 : 1
  });

  this.pnlMaintain = blessed.box({
    screen: this.scnMain,
    parent: this.sdiRoot,
    name: 'pnlMaintain',
    width: '35%',
    left: '35%',
    border: 'line',
    style: {
      border: {
        fg: 'white'
      }
    },
    label: ' Maintain ',
    padding: {
      left: 1,
      right: 1
    }
  });

  this.btnImport = blessed.button({
    screen: this.scnMain,
    parent: this.pnlMaintain,
    height: 3,
    name: 'btnImport',
    content: 'Import Training Package',
    align: 'center',
    style: {
      fg: 'black',
      bg: 'white',
      focus: {
        bg: 'blue',
        fg: 'white',
        border: {
          fg: 'blue'
        }
      },
      border: {
        fg: 'white'
      }
    },
    border: 'line',
    tabIndex: 2
  });

  this.addTabbableElements({
    elements: [
      this.btnResume,
      this.lstResumeTrainingPackages,
      this.btnImport
    ]
  });
}

WorkspaceExplorer.prototype.defineEventHandlers = function () {
  this.btnImport.on('press', this.btnImport_onPress.bind(this));
  this.lstResumeTrainingPackages.on('select', this.lstResumeTrainingPackages_onSelect.bind(this));
  this.trainingPackageChooser.on('accept', this.trainingPackageChooser_onAccept.bind(this));
}

WorkspaceExplorer.prototype.construct = function () {
  this.defineScreenElements();
  this.defineEventHandlers();
}

WorkspaceExplorer.prototype.btnImport_onPress = function () {
  this.trainingPackageChooser.show();
}

WorkspaceExplorer.prototype.lstResumeTrainingPackages_onSelect = async function (item, index) {
  try {
    const path = this.lstResumeTrainingPackages.data.keys[index];
    await this.trainingPackage.load({ path });

    if (this.trainingPackageExplorer) {
      this.trainingPackageExplorer.setTrainingPackage({ trainingPackage });
    } else {
      this.trainingPackageExplorer = new TrainingPackageExplorer({
        mainContainer: this.mainContainer,
        scnMain: this.scnMain,
        trainingPackage: this.trainingPackage
      });
    }

    this.trainingPackageExplorer.show();
  } catch (error) {
    switch (error.code) {
      case 'invalid-package-folder':
        // @todo display popup / message
        break;
    }
  }
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
      this.lstResumeTrainingPackages.focus();
      if (wasEmpty) {
        this.lstResumeTrainingPackages.options.tabIndex = 1;
        this.addTabbableElement({ element: this.lstResumeTrainingPackages });
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

WorkspaceExplorer.prototype.refreshTrainingPackages = function () {
  this.lstResumeTrainingPackages.setItems(this.workspace.trainingPackageTitles);
  this.lstResumeTrainingPackages.data.keys = Object.keys(this.workspace.trainingPackages);
}

WorkspaceExplorer.prototype.show = function () {
  this.refreshTrainingPackages();

  TabView.prototype.show.call(this);
}

module.exports = {
  WorkspaceExplorer
};