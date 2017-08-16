const blessed = require('blessed');
const os = require('os');

const FileExplorer = require('./file-explorer').FileExplorer;
const SolutionMonitor = require('./solution-monitor').SolutionMonitor;
const TabView = require('./tab-view').TabView;

function TrainingPackageExplorer(
  {
    mainContainer,
    scnMain,
    workspace
  } = {}
) {
  TabView.call(this, {
    scnMain,
    parent: mainContainer,
    name: 'trainingPackageExplorerRoot',
    label: ' Training Package Explorer '
  })

  Object.assign(this, { mainContainer, scnMain, workspace });

  const options = {
    title: ' Choose Solution '
  };
  this.solutionChooser = new FileExplorer(Object.assign(options, this));
  this.solutionMonitor = new SolutionMonitor(this);

  this.construct();
}

TrainingPackageExplorer.prototype = Object.create(TabView.prototype);

TrainingPackageExplorer.prototype.construct = function () {
  this.defineScreenElements();
  this.defineEventHandlers();
}

TrainingPackageExplorer.prototype.defineEventHandlers = function () {
  this.btnSubmit.on('press', this.btnSubmit_onPress.bind(this));
  this.lstExercises.on('select', this.lstExercises_onSelect.bind(this));
  this.lstExercises.on('scroll', this.lstExercises_onScroll.bind(this));
  this.solutionChooser.on('accept', this.solutionChooser_onAccept.bind(this));
  this.solutionMonitor.on('fail', this.solutionMonitor_onFail.bind(this));
  this.solutionMonitor.on('hide', this.solutionMonitor_onHide.bind(this));
  this.solutionMonitor.on('pass', this.solutionMonitor_onPass.bind(this));
}

TrainingPackageExplorer.prototype.defineScreenElements = function () {
  this.lstExercises = new blessed.ListTable({
    screen: this.scnMain,
    parent: this.sdiRoot,
    name: 'lstExercises',
    keys: true,
    interactive: true,
    invertSelected: true,
    scrollable: true,
    tags: true,
    noCellBorders: true,
    border: 'line',
    label: ' Exercises ',
    width: '25%',
    height: '100%-2',
    selectedBg: 'white',
    selectedFg: 'black',
    align: 'left',
    style: {
      selected: {
        bg: 'white',
        fg: 'black',
      },
      border: {
        fg: 'white'
      },
      item: {
        fg: 'green'
      },
      focus: {
        border: {
          fg: 'blue'
        },
        selected: {
          fg: 'white',
          bg: 'blue'
        }
      },
      header: {
        bold: true,
        fg: 'white'
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
    padding: {
      left: 1,
      right: 1
    },
    tabIndex: 0
  });

  this.txtInstructions = new blessed.Text({
    screen: this.scnMain,
    parent: this.sdiRoot,
    name: 'txtInstructions',
    keys: true,
    scrollable: true,
    tags: true,
    border: 'line',
    width: '75%-2',
    left: '25%',
    style: {
      fg: 'white',
      border: {
        fg: 'white'
      },
      focus: {
        border: {
          fg: 'blue'
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
    padding: {
      left: 1,
      right: 1
    },
    tabIndex: 1,
    label: ' Instructions ',
    height: '100%-5'
  });

  this.btnSubmit = new blessed.Button({
    screen: this.scnMain,
    parent: this.sdiRoot,
    top: '100%-5',
    height: 3,
    left: '25%',
    width: '75%-2',
    name: 'submit',
    content: 'Ready to Submit My Solution',
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
}

TrainingPackageExplorer.prototype.setTrainingPackage = function (
  {
    currentExercise,
    trainingPackage
  } = {}
) {
  this.trainingPackage = trainingPackage;
  this.workspace.setCurrentTrainingPackage({ trainingPackage });
  this.lstExercises.setRows(this.workspace.currentTrainingPackageRows);
  this.solutionMonitor.trainingPackage = this.trainingPackage;

  if (currentExercise !== undefined) {
    this.lstExercises.select(currentExercise + 1);
    this.txtInstructions.focus();
  }

  this.scnMain.render();
}

TrainingPackageExplorer.prototype.setActiveExercise = function (
  {
    index
  } = {}
) {
  this.activeExercise = this.trainingPackage.exercises[index];
  this.workspace.setCurrentExercise({ index });
  this.solutionMonitor.activeExercise = this.activeExercise;

  this.txtInstructions.removeLabel();
  this.txtInstructions.setLabel(` ${this.activeExercise.title} `);

  let fg = 'white';
  if (this.activeExercise.style && this.activeExercise.style.fg) {
    fg = this.activeExercise.style.fg;
  }

  this.txtInstructions.style.fg = fg;
  this.txtInstructions.resetScroll();
  this.txtInstructions.setContent(this.activeExercise.instructions.join(os.EOL));
}

TrainingPackageExplorer.prototype.btnSubmit_onPress = function () {
  this.solutionChooser.show();
}

TrainingPackageExplorer.prototype.lstExercises_onScroll = function () {
  if (this.lstExercises.selected - 1 >= 0) {
    this.setActiveExercise({ index: this.lstExercises.selected - 1 });
    this.scnMain.render();
  }
}

TrainingPackageExplorer.prototype.lstExercises_onSelect = function (item, index) {
  this.setActiveExercise({ index: index - 1 });
  this.txtInstructions.focus();
  this.scnMain.render();
}

TrainingPackageExplorer.prototype.solutionChooser_onAccept = async function (path) {
  try {
    this.solutionChooser.hide();

    this.solutionMonitor.solutionPath = path;
    this.solutionMonitor.show();
  } catch (error) {
    console.error(error);
    // @todo display popup / message
  }
}

TrainingPackageExplorer.prototype.refreshExercises = function (
  {
    positionNextIncomplete = true
  } = {}
) {
  let selected = this.lstExercises.selected;
  this.lstExercises.setRows(this.workspace.currentTrainingPackageRows);

  if (positionNextIncomplete) {
    selected = this.workspace.getNextIncompleteExercise({ relative: selected - 1 }) + 1;
  }

  this.lstExercises.selected = selected;
  this.lstExercises_onSelect(null, selected);
}

TrainingPackageExplorer.prototype.solutionMonitor_onFail = function () {
  this.workspace.failCurrentExercise();
  this.refreshExercises({ positionNextIncomplete: false });
}

TrainingPackageExplorer.prototype.solutionMonitor_onHide = function () {
  if (this.workspace.isCurrentTrainingPackageComplete()) {
    // @todo display popup
    this.hide();
  }
}

TrainingPackageExplorer.prototype.solutionMonitor_onPass = function () {
  this.workspace.passCurrentExercise();
  this.refreshExercises();
  this.scnMain.saveFocus();
}

module.exports = {
  TrainingPackageExplorer
};
