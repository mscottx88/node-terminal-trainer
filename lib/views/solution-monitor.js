const blessed = require('blessed');
const resolve = require('path').resolve;
const fork = require('child_process').fork;

const TabView = require('./tab-view').TabView;

function SolutionMonitor(
  {
    mainContainer = this.mainContainer,
    scnMain = this.scnMain,
    trainingPackage = this.trainingPackage,
    activeExercise = this.activeExercise,
    solutionPath = this.solutionPath
  } = {}
) {
  Object.assign(this, { mainContainer, scnMain, trainingPackage, activeExercise, solutionPath });

  TabView.call(this, {
    name: 'solutionMonitorRoot',
    label: ' Solution Monitor (RUN) ',
    height: '80%',
    width: '60%',
    left: 'center',
    top: 'center'
  });

  this.construct();
}

SolutionMonitor.prototype = Object.create(TabView.prototype);

SolutionMonitor.prototype.construct = function () {
  this.defineScreenElements();
  this.defineEventHandlers();
}

SolutionMonitor.prototype.defineEventHandlers = function () {
  this.btnOkay.on('press', this.btnOkay_onPress.bind(this));
}

SolutionMonitor.prototype.btnOkay_onPress = function () {
  this.hide();
}

SolutionMonitor.prototype.defineScreenElements = function () {
  this.addScreenElement({
    definition: {
      keys: true,
      alwaysScroll: true,
      tags: true,
      padding: {
        left: 1,
        right: 1
      },
      label: ' stdout '
    },
    helpLines: [
      'Console output from the {bold}Test{/} of your {bold}Solution{/} appears here.  When the test either ' +
      '{bold}PASSES{/} or {red-fg}{bold}FAILS{/}, a continue button will appear.',
      'Press the {white-fg}{bold}UP{/} and {white-fg}{bold}DOWN{/} keys to scroll through the text.',
      'Press the {white-fg}{bold}TAB{/} key to change the {blue-bg}{white-fg}focus{/}.  Press ' +
      'the {white-fg}{bold}ESCAPE{/} key to go back.'
    ],
    name: 'txtStdOut',
    scrollable: true,
    type: 'Text'
  });

  this.addScreenElement({
    definition: {
      height: 3,
      content: 'OK',
      align: 'center',
      hidden: true
    },
    helpLines: [
      '--placeholder--',
      'Press the {white-fg}{bold}ENTER{/} key or the {white-fg}{bold}SPACEBAR{/} key to {bold}continue{/}.',
      'Press the {white-fg}{bold}TAB{/} key to change the {blue-bg}{white-fg}focus{/}.  Press ' +
      'the {white-fg}{bold}ESCAPE{/} key to go back.'
    ],
    name: 'btnOkay',
    type: 'Button'
  });
}

SolutionMonitor.prototype.layoutElements = function () {
  this.txtStdOut.width = this.internalWidth;
  if (this.btnOkay.hidden) {
    this.txtStdOut.height = this.internalHeight;
  } else {
    this.txtStdOut.height = this.internalHeight - this.btnOkay.height;
  }

  this.btnOkay.top = this.txtStdOut.height;
  this.btnOkay.width = this.internalWidth;
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

    this.layoutElements();
    this.scnMain.render();
  });

  mocha.on('exit', (code) => {
    this.sdiRoot.removeLabel();

    // remove placeholder
    this.btnOkay.options.helpLines.shift();

    if (code !== 0) {
      this.sdiRoot.setLabel(' Solution Monitor (FAIL) ');
      this.sdiRoot.style.border.fg = 'red';

      this.btnOkay.options.helpLines.unshift(
        '{bold}Darn.{/}  It appears your {bold}Solution{/} {bold}{red-fg}FAILED{/} the test(s).  Try ' +
        'examining the output for possible causes and try again!'
      );

      this.emit('fail');
    } else {
      this.sdiRoot.setLabel(' Solution Monitor (PASS) ');
      this.sdiRoot.style.border.fg = 'green';

      this.btnOkay.options.helpLines.unshift(
        '{bold}Congratulations!{/}  Your {bold}Solution{/} {bold}PASSED{/} the test(s)!'
      );

      this.emit('pass');
    }

    this.btnOkay.show();
    this.btnOkay.focus();

    this.layoutElements();
    this.scnMain.render();
  });

  this.sdiRoot.style.border.fg = 'yellow';
  this.txtStdOut.setContent('');
  this.btnOkay.hide();

  this.layoutElements();
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
