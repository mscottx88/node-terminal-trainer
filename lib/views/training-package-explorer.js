const blessed = require('blessed');
const os = require('os');

const FileExplorer = require('./file-explorer').FileExplorer;
const SolutionMonitor = require('./solution-monitor').SolutionMonitor;
const TabView = require('./tab-view').TabView;

function TrainingPackageExplorer(
  {
    mainContainer,
    scnMain,
    trainingPackage
  } = {}
) {
  TabView.call(this, {
    scnMain,
    parent: mainContainer,
    name: 'trainingPackageExplorerRoot',
    label: ' Training Package Explorer '
  })

  Object.assign(this, { mainContainer, scnMain, trainingPackage });

  const options = {
    title: ' Choose Solution '
  };
  this.solutionChooser = new FileExplorer(Object.assign(options, this));

  this.construct();
  this.setTrainingPackage({ trainingPackage });
}

TrainingPackageExplorer.prototype = Object.create(TabView.prototype);

TrainingPackageExplorer.prototype.construct = function () {
  this.defineScreenElements();
  this.defineEventHandlers();
}

TrainingPackageExplorer.prototype.defineEventHandlers = function () {
  this.btnSubmit.on('press', this.btnSubmit_onPress.bind(this));
  this.lstExercises.on('select', this.lstExercises_onSelect.bind(this));
  this.solutionChooser.on('accept', this.solutionChooser_onAccept.bind(this));
}

TrainingPackageExplorer.prototype.defineScreenElements = function () {
  this.lstExercises = blessed.list({
    screen: this.scnMain,
    parent: this.sdiRoot,
    name: 'lstExercises',
    keys: true,
    interactive: true,
    invertSelected: true,
    scrollable: true,
    tags: true,
    border: 'line',
    label: ' Exercises ',
    width: '25%',
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
    tabIndex: 1
  });

  this.txtInstructions = blessed.text({
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
    tabIndex: -1,
    label: ' Instructions ',
    height: '100%-5',
    hidden: true
  });

  this.btnSubmit = blessed.button({
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
    tabIndex: -1,
    hidden: true
  });

  this.addTabbableElements({
    elements: [
      this.lstExercises,
      this.txtInstructions,
      this.btnSubmit
    ]
  });
}

TrainingPackageExplorer.prototype.setTrainingPackage = function (
  {
    trainingPackage
  } = {}
) {
  this.trainingPackage = trainingPackage;
  this.lstExercises.setItems(this.trainingPackage.exerciseTitles);
  this.scnMain.render();
}

TrainingPackageExplorer.prototype.setActiveExercise = function (
  {
    index
  } = {}
) {
  this.activeExercise = this.trainingPackage.exercises[index];

  this.txtInstructions.removeLabel();
  this.txtInstructions.setLabel(` ${this.activeExercise.title} `);

  let fg = 'white';
  if (this.activeExercise.style && this.activeExercise.style.fg) {
    fg = this.activeExercise.style.fg;
  }

  this.txtInstructions.options.tabIndex = 1;
  this.txtInstructions.style.fg = fg;
  this.txtInstructions.resetScroll();
  this.txtInstructions.setContent(this.activeExercise.instructions.join(os.EOL));
  this.txtInstructions.show();

  this.btnSubmit.options.tabIndex = 2;
  this.btnSubmit.show();

  this.addTabbableElements({ elements: [this.txtInstructions, this.btnSubmit] });
}

TrainingPackageExplorer.prototype.btnSubmit_onPress = function () {
  this.solutionChooser.show();
}

TrainingPackageExplorer.prototype.lstExercises_onSelect = function (item, index) {
  this.setActiveExercise({ index });
  this.txtInstructions.focus();
  this.scnMain.render();
}

TrainingPackageExplorer.prototype.solutionChooser_onAccept = async function (path) {
  try {
    // here is where the solution gets pumped into mocha
    const options = {
      solutionPath: path
    };
    this.solutionMonitor = new SolutionMonitor(Object.assign(options, this));

    this.solutionChooser.hide();
    this.solutionMonitor.show();
  } catch (error) {
    console.error(error);
    // @todo display popup / message
  }
}

module.exports = {
  TrainingPackageExplorer
};
