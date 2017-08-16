const blessed = require('blessed');
const resolve = require('path').resolve;
const fork = require('child_process').fork;

const TabView = require('./tab-view').TabView;

function SolutionMonitor(
  {
    mainContainer,
    scnMain,
    trainingPackage,
    activeExercise,
    solutionPath
  } = {}
) {
  TabView.call(this, {
    scnMain,
    parent: mainContainer,
    name: 'solutionMonitorRoot',
    label: ' Solution Monitor (RUN) ',
    height: '80%',
    width: '60%',
    left: 'center',
    top: 'center'
  })

  Object.assign(this, { mainContainer, scnMain, trainingPackage, activeExercise, solutionPath });

  this.construct();
}

SolutionMonitor.prototype = Object.create(TabView.prototype);

SolutionMonitor.prototype.construct = function () {
  this.defineScreenElements();
  this.defineEventHandlers();
}

SolutionMonitor.prototype.defineEventHandlers = function () {
  this.btnOkay.on('show', this.btnOkay_onShow.bind(this));
  this.btnOkay.on('press', this.btnOkay_onPress.bind(this));
}

SolutionMonitor.prototype.btnOkay_onShow = function () {
  this.txtStdOut.height = '100%-5';
}

SolutionMonitor.prototype.btnOkay_onPress = function () {
  this.hide();
}

SolutionMonitor.prototype.defineScreenElements = function () {
  this.txtStdOut = blessed.text({
    screen: this.scnMain,
    parent: this.sdiRoot,
    name: 'txtStdOut',
    keys: true,
    scrollable: true,
    alwaysScroll: true,
    tags: true,
    border: 'line',
    style: {
      fg: 'white',
      border: {
        fg: 'white'
      },
      focus: {
        border: {
          fg: 'blue'
        }
      },
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
    tabIndex: 0,
    label: ' stdout ',
    height: '100%-2',
    width: '100%-4'
  });

  this.btnOkay = blessed.button({
    screen: this.scnMain,
    parent: this.sdiRoot,
    top: '100%-5',
    height: 3,
    name: 'okay',
    content: 'OK',
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
    tabIndex: 1,
    hidden: true
  });
}

SolutionMonitor.prototype.run = function () {
  const args = [
    ...this.activeExercise.script.tests.map(script => resolve(this.trainingPackage.directory, script)),
    '--reporter',
    'spec',
    '-x',
    this.solutionPath
  ];

  const options = {
    cwd: process.cwd(),
    execArgv: [],
    silent: true
  };

  const mocha = fork('./node_modules/mocha/bin/_mocha', args, options);

  mocha.stdout.on('data', (data) => {
    const text = new Buffer(data).toString('utf8');

    this.txtStdOut.insertBottom(text);
    this.txtStdOut.setScrollPerc(100);
    this.scnMain.render();
  });

  mocha.on('exit', (code) => {
    this.sdiRoot.removeLabel();
    if (code !== 0) {
      this.sdiRoot.setLabel(' Solution Monitor (FAIL) ');
      this.sdiRoot.style.border.fg = 'red';
      this.emit('fail');
    } else {
      this.sdiRoot.setLabel(' Solution Monitor (PASS) ');
      this.sdiRoot.style.border.fg = 'green';
      this.emit('pass');
    }
    this.btnOkay.show();
    this.btnOkay.focus();
    this.scnMain.render();
  });

  this.sdiRoot.style.border.fg = 'yellow';
  this.txtStdOut.setContent('');
  this.scnMain.render();
}

SolutionMonitor.prototype.show = function () {
  this.scnMain.saveFocus();

  TabView.prototype.show.call(this);

  this.txtStdOut.focus();
  this.run();
}

SolutionMonitor.prototype.hide = function () {
  TabView.prototype.hide.call(this);

  this.scnMain.restoreFocus();
  this.scnMain.render();
}

module.exports = {
  SolutionMonitor
};
