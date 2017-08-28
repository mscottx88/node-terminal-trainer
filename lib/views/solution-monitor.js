const blessed = require('blessed');
const resolve = require('path').resolve;
const fork = require('child_process').fork;

const TabView = require('./tab-view').TabView;

class SolutionMonitor extends TabView {
  constructor(
    {
      mainContainer,
      scnMain,
      trainingPackage,
      activeExercise,
      solutionPath
    } = {}
  ) {
    super({
      height: '80%',
      label: ' Solution Monitor (RUN) ',
      left: 'center',
      modal: true,
      name: 'solutionMonitorRoot',
      parent: mainContainer,
      screen: scnMain,
      top: 'center',
      width: '60%'
    });

    Object.assign(this, { mainContainer, scnMain, trainingPackage, activeExercise, solutionPath });

    this.construct();
  }

  construct() {
    this.defineScreenElements();
    this.defineEventHandlers();
  }

  defineEventHandlers() {
    this.btnOkay.on('press', this.btnOkay_onPress.bind(this));
  }

  defineScreenElements() {
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

  layoutElements() {
    this.txtStdOut.width = this.internalWidth;
    if (this.btnOkay.hidden) {
      this.txtStdOut.height = this.internalHeight;
    } else {
      this.txtStdOut.height = this.internalHeight - this.btnOkay.height;
    }

    this.btnOkay.top = this.txtStdOut.height;
    this.btnOkay.width = this.internalWidth;
  }

  run() {
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

    this.sdiRoot.removeLabel();
    this.sdiRoot.setLabel(' Solution Monitor (RUN) ');

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
          '{bold}Congratulations!{/}  Your {bold}Solution{/} has {bold}PASSED{/} the test(s)!'
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

  show() {
    super.show();

    this.txtStdOut.focus();
    this.run();
  }

  btnOkay_onPress() {
    this.hide();
  }
}

module.exports = {
  SolutionMonitor
};
