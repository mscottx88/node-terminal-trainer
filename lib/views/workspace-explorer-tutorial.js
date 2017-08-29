const blessed = require('blessed');
const os = require('os');
const TabView = require('./tab-view').TabView;
const _ = require('lodash');

class WorkspaceExplorerTutorial extends TabView {
  constructor(
    {
      mainContainer = this.mainContainer,
      scnMain = this.scnMain,
      workspace = this.workspace
    } = {}
  ) {
    super({
      name: 'workspaceExplorerTutorial',
      label: ' Workspace Explorer Tutorial ',
      modal: true,
      height: '80%',
      width: '80%',
      left: 'center',
      showHelpArea: false,
      parent: mainContainer,
      screen: scnMain,
      top: 'center'
    });

    Object.assign(this, { mainContainer, scnMain, workspace });

    this.construct();
  }

  defineScreenElements() {
    this.addScreenElement({
      definition: {
        keys: true,
        tags: true,
        padding: {
          left: 1,
          right: 1
        },
        label: ' Welcome '
      },
      name: 'txtWelcome',
      scrollable: true,
      type: 'Text'
    });

    this.txtWelcome.setContent([
      '{bold}Welcome to the Workspace Explorer Tutorial!{/}',
      '',
      'This tutorial is here to help guide you in using the Workspace Explorer, ' +
      'which you can see behind me.',
      '',
      'Let\'s start by learning about {bold}Navigation{/}.  To begin, press the {white-fg}{bold}TAB{/} key now.'
    ].join(os.EOL));

    this.addScreenElement({
      definition: {
        keys: true,
        tags: true,
        padding: {
          left: 1,
          right: 1
        },
        label: ' Navigation ',
        content: 'Press the {white-fg}{bold}TAB{/} key to continue...'
      },
      name: 'txtNavigation',
      scrollable: true,
      type: 'Text'
    });

    this.addScreenElement({
      definition: {
        keys: true,
        tags: true,
        padding: {
          left: 1,
          right: 1
        },
        label: ' Navigation Continued ',
        hidden: true
      },
      focusable: false,
      name: 'pnlNavigation',
      type: 'Box'
    });

    this.addScreenElement({
      definition: {
        keys: true,
        tags: true,
        padding: {
          left: 1,
          right: 1
        },
        style: {
          fg: 'green'
        },
        label: ' Buttons ',
        hidden: true
      },
      focusable: false,
      name: 'pnlButton',
      parent: this.pnlNavigation,
      type: 'Box'
    });

    this.addScreenElement({
      definition: {
        content: 'Example Button 1',
        align: 'center',
        hidden: true
      },
      name: 'btnExample1',
      parent: this.pnlButton,
      type: 'Button'
    });

    this.addScreenElement({
      definition: {
        content: 'Example Button 2',
        align: 'center',
        hidden: true
      },
      name: 'btnExample2',
      parent: this.pnlButton,
      type: 'Button'
    });

    this.addScreenElement({
      definition: {
        content: 'Example Button 3',
        align: 'center',
        hidden: true
      },
      name: 'btnExample3',
      parent: this.pnlButton,
      type: 'Button'
    });

    this.addScreenElement({
      definition: {
        keys: true,
        tags: true,
        padding: {
          left: 1,
          right: 1
        },
        style: {
          fg: 'green'
        },
        label: ' Lists ',
        hidden: true
      },
      focusable: false,
      name: 'pnlList',
      parent: this.pnlNavigation,
      type: 'Box'
    });

    this.addScreenElement({
      definition: {
        label: ' Example List 1 ',
        hidden: true
      },
      name: 'lstExample1',
      parent: this.pnlList,
      scrollable: true,
      type: 'ColumnList'
    });

    this.lstExample1.setRows({
      align: ['left', 'right'],
      rows: [
        ['Header One', 'Header Two'],
        ..._.times(this.lstExample1.height * 2, (index) => [`Sample Row ${index + 1}`, `Sample Row ${index + 1}`])
      ]
    });

    this.addScreenElement({
      definition: {
        label: ' Example List 2 ',
        hidden: true
      },
      name: 'lstExample2',
      parent: this.pnlList,
      scrollable: true,
      type: 'ColumnList'
    });

    this.lstExample2.setRows({
      align: ['left', 'right'],
      rows: [
        ['Header One', 'Header Two'],
        ..._.times(this.lstExample1.height * 2, (index) => [`Sample Row ${index + 1}`, `Sample Row ${index + 1}`])
      ]
    });

    this.addScreenElement({
      definition: {
        keys: true,
        tags: true,
        padding: {
          left: 1,
          right: 1
        },
        style: {
          fg: 'green'
        },
        label: ' Preferences ',
        hidden: true
      },
      focusable: false,
      name: 'pnlPreferences',
      type: 'Box'
    });

    this.addScreenElement({
      definition: {
        keys: true,
        tags: true,
        padding: {
          left: 1,
          right: 1
        },
        style: {
          fg: 'green'
        },
        text: 'Show Tutorial At Startup',
        checked: this.workspace.getPreference({ name: 'showTutorial', defaultValue: true }),
        hidden: true
      },
      focusable: true,
      name: 'chkShowTutorial',
      parent: this.pnlPreferences,
      type: 'Checkbox'
    });
  }

  defineEventHandlers() {
    this.boundTxtWelcome_onKey = this.txtWelcome_onKey.bind(this, 'tab');

    this.btnExample1.on('press', this.btnExample_onPress.bind(this, 0));
    this.btnExample2.on('press', this.btnExample_onPress.bind(this, 1));
    this.btnExample3.on('press', this.btnExample_onPress.bind(this, 2));

    this.lstExample1.on('select', this.lstExample_onSelect.bind(this, 0));
    this.lstExample2.on('select', this.lstExample_onSelect.bind(this, 1));

    this.pnlList.on('show', this.pnlList_onShow.bind(this));
    this.pnlNavigation.on('show', this.pnlNavigation_onShow.bind(this));
    this.pnlPreferences.on('show', this.pnlPreferences_onShow.bind(this));

    this.txtNavigation.key('tab', this.txtNavigation_onKey.bind(this, 'tab'));
    this.txtWelcome.key('tab', this.boundTxtWelcome_onKey);

    this.on('hide', this.onHide.bind(this));
  }

  construct() {
    this.defineScreenElements();
    this.defineEventHandlers();
  }

  layoutElements() {
    this.txtWelcome.width = this.internalWidth;
    if (this.txtNavigation.hidden) {
      this.txtWelcome.height = '30%';
    } else {
      this.txtWelcome.height = '50%';
    }

    this.txtNavigation.width = this.internalWidth;
    this.txtNavigation.height = this.internalHeight - this.txtWelcome.height;
    this.txtNavigation.top = '50%';

    this.pnlNavigation.width = this.internalWidth;
    this.pnlNavigation.top = '30%';

    this.pnlPreferences.height = 5;
    this.pnlPreferences.top = this.internalHeight - this.pnlPreferences.height;
    this.pnlPreferences.width = this.internalWidth;

    if (this.pnlPreferences.hidden) {
      this.pnlNavigation.height = this.internalHeight - this.txtWelcome.height;
    } else {
      this.pnlNavigation.height = this.internalHeight - this.txtWelcome.height - this.pnlPreferences.height;
    }

    this.pnlButton.width = '30%';

    this.btnExample1.top = 0;
    this.btnExample2.top = this.btnExample1.height;
    this.btnExample3.top = this.btnExample1.height + this.btnExample2.height;

    this.pnlList.width = this.pnlNavigation.width - this.pnlButton.width - 4;
    this.pnlList.left = this.pnlButton.width;

    this.lstExample1.width = '50%-2';
    this.lstExample1.height = '100%-2';

    this.lstExample2.width = this.pnlList.width - this.lstExample1.width - 4;
    this.lstExample2.height = '100%-2';
    this.lstExample2.left = '50%-2';
  }

  show() {
    this.layoutElements();

    TabView.prototype.show.call(this);
  }

  onHide() {
    this.workspace.setPreference({
      name: 'showTutorial',
      value: this.chkShowTutorial.checked
    });
  }

  btnExample_onPress(controlIndex) {
    this.txtWelcome.setContent([
      `{bold}Awesome!{/}  You chose {bold}Example Button ${controlIndex + 1}{/}.`,
      '',
      'Now, see the lists that have appeared?  Try navigating through them and when you\'re ready, ' +
      'press the {white-fg}{bold}ENTER{/} key or the {white-fg}{bold}SPACEBAR{/} key to select ' +
      'an item in a list.',
      '',
      'Notice each list has a scrollbar.  Use the {white-fg}{bold}UP{/} and {white-fg}{bold}DOWN{/} arrows to change ' +
      'selection in the lists.  As before, the border of the list with {blue-bg}{white-fg}focus{/} appears in {blue-bg}{white-fg}blue{/}.  Also,' +
      'the current {blue-bg}{white-fg}focused{/} selection is {blue-bg}{white-fg}blue{/}.  The {white-bg}{black-fg}selected{/} item appears in ' +
      '{white-bg}{black-fg}white{/}, if the list has lost {blue-bg}{white-fg}focus{/}.'
    ].join(os.EOL));

    this.btnExample1.removeAllListeners('press');
    this.btnExample2.removeAllListeners('press');
    this.btnExample3.removeAllListeners('press');

    this.pnlList.show();
    this.scnMain.render();
  }

  lstExample_onSelect(controlIndex, item, itemIndex) {
    this.txtWelcome.setContent([
      `{bold}Nicely done!{/}  You selected row number ${itemIndex + 1} from {bold}Example List ${controlIndex + 1}{/}.`,
      '',
      'Now, you can choose to display this tutorial next time, or to suppress it.  {white-fg}{bold}TAB{/} ' +
      'to {blue-bg}{white-fg}focus{/} on the {white-fg}Preferences{/} panel and either check or uncheck the {white-fg}Tutorial{/} setting.  You can toggle ' +
      'the setting using either the {white-fg}{bold}ENTER{/} key or the {white-fg}{bold}SPACEBAR{/} key.',
      '',
      'To leave the tutorial press the {white-fg}{bold}ESCAPE{/} key at any time.  The {white-fg}{bold}ESCAPE{/} key ' +
      'can be used on any screen to go back.  Pressing the {white-fg}{bold}ESCAPE{/} key on the {white-fg}Workspace Explorer{/} ' +
      'screen will exit the application completely.',
      '',
      'You can also use the {red-fg}{bold}CTRL-C{/} key anytime to immediately exit.  Don\'t worry - all your progress ' +
      'is always automatically saved.'
    ].join(os.EOL));

    this.lstExample1.removeAllListeners('select');
    this.lstExample2.removeAllListeners('select');

    this.pnlPreferences.show();

    this.scnMain.render();
  }

  pnlList_onShow() {
    this.lstExample1.show();
    this.lstExample2.show();
    this.lstExample1.focus();

    this.layoutElements();
    this.scnMain.render();
  }

  pnlNavigation_onShow() {
    this.pnlButton.show();
    this.btnExample1.show();
    this.btnExample2.show();
    this.btnExample3.show();

    this.layoutElements();
    this.scnMain.render();
  }

  pnlPreferences_onShow() {
    this.chkShowTutorial.show();

    this.layoutElements();
    this.scnMain.render();
  }

  txtNavigation_onKey(name, ch, key) {
    if (name === 'tab') {
      this.txtWelcome.setContent([
        '{bold}Great!{/}  It looks like you\'ve grasped the {blue-bg}{white-fg}focus{/} concept with the {white-fg}{bold}TAB{/} key.',
        '',
        'As you may have noticed, some more interesting elements have appeared on the screen ' +
        'below.  Press the {white-fg}{bold}TAB{/} key to learn more about them.'
      ].join(os.EOL));

      this.txtNavigation.hide();
      this.txtNavigation.detach();

      this.pnlNavigation.show();

      this.layoutElements();
      this.scnMain.render();
    }
  }

  txtWelcome_onKey(name, ch, key) {
    if (name === 'tab') {
      if (!this.txtNavigation.hidden) {
        this.txtNavigation.setContent([
          '{bold}Excellent!{/}  Did you notice that when you pressed {white-fg}{bold}TAB{/}, the border of the {bold}Welcome{/} ' +
          'panel changed to {white-fg}white{/}?  Also, notice that the border of this panel is now {blue-bg}{white-fg}blue{/}.',
          '',
          'The {white-fg}{bold}TAB{/} key is used throughout the application to change your {blue-bg}{white-fg}focus{/}.  Also, ' +
          'the element with the current focus will be highlighted in {blue-bg}{white-fg}blue{/}.',
          '',
          'Now, try pressing the {white-fg}{bold}TAB{/} key again to return focus to the {bold}Welcome{/} panel.'
        ].join(os.EOL));

        this.txtWelcome.setContent('Press the {white-fg}{bold}TAB{/} key to continue...');
      } else {
        this.txtWelcome.removeLabel();
        this.txtWelcome.setLabel(' Guide ');

        this.txtWelcome.setContent([
          'Instructions about continuing the tutorial will now appear here.',
          '',
          'Go ahead and press the {white-fg}{bold}TAB{/} key to navigate through the {bold}Example ' +
          'Buttons{/} below.  As before, when you use the {white-fg}{bold}TAB{/} key, the current item ' +
          'with the {blue-bg}{white-fg}focus{/} is highlighted in {blue-bg}{white-fg}blue{/}.',
          '',
          'When you\'re ready, press the {white-fg}{bold}ENTER{/} key or the {white-fg}{bold}SPACEBAR{/} key ' +
          'while {blue-bg}{white-fg}focused{/} on an {bold}Example Button{/} below.'
        ].join(os.EOL));

        this.txtWelcome.unkey('tab', this.boundTxtWelcome_onKey);
      }

      this.layoutElements();
      this.scnMain.render();
    }
  }
}

module.exports = {
  WorkspaceExplorerTutorial
};
