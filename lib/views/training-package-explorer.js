const blessed = require('blessed');
const os = require('os');

const FileExplorer = require('./file-explorer').FileExplorer;
const SolutionMonitor = require('./solution-monitor').SolutionMonitor;
const TabView = require('./tab-view').TabView;

function TrainingPackageExplorer(
  {
    mainContainer = this.mainContainer,
    scnMain = this.scnMain,
    workspace = this.workspace
  } = {}
) {
  Object.assign(this, { mainContainer, scnMain, workspace });

  TabView.call(this, {
    name: 'trainingPackageExplorerRoot',
    label: ' Training Package Explorer '
  })

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
  this.addScreenElement({
    definition: {
      label: ' Exercises ',
      width: '25%',
      height: '100%-2',
    },
    name: 'lstExercises',
    scrollable: true,
    type: 'ColumnList'
  });

  this.addScreenElement({
    definition: {
      keys: true,
      tags: true,
      border: 'line',
      width: '75%-2',
      left: '25%',
      padding: {
        left: 1,
        right: 1
      },
      label: ' Instructions ',
      height: '100%-5'
    },
    name: 'txtInstructions',
    scrollable: true,
    type: 'Text'
  });

  this.addScreenElement({
    definition: {
      top: '100%-5',
      height: 3,
      left: '25%',
      width: '75%-2',
      content: 'Ready to Submit My Solution',
      align: 'center'
    },
    name: 'btnSubmit',
    type: 'Button'
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
  this.lstExercises.setRows(this.workspace.currentTrainingPackageView);
  this.solutionMonitor.trainingPackage = this.trainingPackage;

  if (currentExercise !== undefined) {
    this.lstExercises.select(currentExercise);
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
  if (this.lstExercises.selected >= 0) {
    this.setActiveExercise({ index: this.lstExercises.selected });
    this.scnMain.render();
  }
}

TrainingPackageExplorer.prototype.lstExercises_onSelect = function (item, index) {
  this.setActiveExercise({ index });
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
    selected = this.workspace.getNextIncompleteExercise({ relative: selected });
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
