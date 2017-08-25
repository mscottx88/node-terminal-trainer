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
      height: this.internalHeight,
    },
    helpLines: [
      'This is the list of available {bold}Training Exercises{/} in the {bold}Training Package{/}.',
      'Press the {white-fg}{bold}ENTER{/} key or the {white-fg}{bold}SPACEBAR{/} key to open ' +
      'the currently {blue-bg}{white-fg}selected{/} {bold}Training Exercise{/}.',
      'Press the {white-fg}{bold}UP{/} and {white-fg}{bold}DOWN{/} keys to change your selection.',
      'Press the {white-fg}{bold}TAB{/} key to change the {blue-bg}{white-fg}focus{/}.  Press ' +
      'the {white-fg}{bold}ESCAPE{/} key to go back.'
    ],
    name: 'lstExercises',
    scrollable: true,
    type: 'ColumnList'
  });

  this.addScreenElement({
    definition: {
      keys: true,
      tags: true,
      border: 'line',
      width: this.internalWidth - this.lstExercises.width,
      left: this.lstExercises.width,
      padding: {
        left: 1,
        right: 1
      },
      label: ' Instructions ',
      height: this.internalHeight - 3
    },
    helpLines: [
      'These are the instructions for the currently {blue-bg}{white-fg}selected{/} {bold}Training Exercise{/}.',
      'Press the {white-fg}{bold}UP{/} and {white-fg}{bold}DOWN{/} keys to scroll through the text.',
      'Press the {white-fg}{bold}TAB{/} key to change the {blue-bg}{white-fg}focus{/}.  Press ' +
      'the {white-fg}{bold}ESCAPE{/} key to go back.'
    ],
    name: 'txtInstructions',
    scrollable: true,
    type: 'Text'
  });

  this.addScreenElement({
    definition: {
      top: this.internalHeight - 3,
      height: 3,
      left: this.lstExercises.width,
      width: this.txtInstructions.width,
      content: 'Ready to Submit My Solution',
      align: 'center'
    },
    helpLines: [
      'When you\'re ready, {bold}Submit{/} your solution here.  A {bold}File Explorer{/} will appear, allowing ' +
      'you to select your script for submission.',
      'Press the {white-fg}{bold}ENTER{/} key or the {white-fg}{bold}SPACEBAR{/} key to submit ' +
      'your solution.',
      'Press the {white-fg}{bold}TAB{/} key to change the {blue-bg}{white-fg}focus{/}.  Press ' +
      'the {white-fg}{bold}ESCAPE{/} key to go back.'
    ],
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
  this.lstExercises.setRows(this.workspace.currentTrainingPackageView);

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
