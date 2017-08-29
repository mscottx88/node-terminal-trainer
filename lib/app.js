const blessed = require('blessed');
const contrib = require('blessed-contrib');
const EventEmitter = require('events').EventEmitter;

const FileExplorer = require('./views/file-explorer').FileExplorer;
const SplashScreen = require('./views/splash-screen').SplashScreen;
const Workspace = require('./providers/workspace').Workspace;
const WorkspaceExplorer = require('./views/workspace-explorer').WorkspaceExplorer;

const HEARTBEAT_INTERVAL = 5000;
const SPLASH_TIMEOUT = 500;

// Monkey-patch -- *this is why JavaScript is the best language
contrib.tree.prototype.render = function () {
  // if (this.screen.focused === this.rows) this.rows.focus();  // commented out

  this.rows.width = this.width - 3;
  this.rows.height = this.height - 2;  // was 3
  blessed.box.prototype.render.call(this);
};

// Monkey-patch
blessed.list.prototype.setItems = function (items) {
  var original = this.items.slice()
    , selected = this.selected
    , sel = this.ritems[this.selected]
    , i = 0;

  items = items.slice();

  // this.select(0);

  for (; i < items.length; i++) {
    if (this.items[i]) {
      this.items[i].setContent(items[i]);
    } else {
      this.add(items[i]);
    }
  }

  for (; i < original.length; i++) {
    this.remove(original[i]);
  }

  this.ritems = items;

  // this logic does not work for a "tree"
  // contrib.tree uses a blessed.list internally, but apparently the intention
  // of blessed.list is a set of items, uniquely identified soley on their displayed name
  // this does not work for a tree

  // but in this case, the selected element does not change so keep that selection

  // // Try to find our old item if it still exists.
  // sel = items.indexOf(sel);
  // if (~sel) {
  //   this.select(sel);
  // } else if (items.length === original.length) {
  // this.select(selected);
  // } else {
  //   this.select(Math.min(selected, items.length - 1));
  // }

  this.emit('set items');
};

class App extends EventEmitter {
  constructor() {
    super();

    setInterval(() => { }, HEARTBEAT_INTERVAL);

    this.initialCwd = process.cwd();

    this.workspace = new Workspace(this);

    this.construct();
    this.enterWorkspace({ showSplash: true });
  }

  construct() {
    this.defineScreenElements();
    this.defineEventHandlers();
  }

  defineEventHandlers() {
    this.scnMain.ignoreLocked = ['C-c'];
    this.scnMain.key('C-c', this.scnMain_onKey.bind(this, 'exit'));

    this.workspaceChooser.on('accept', this.workspaceChooser_onAccept.bind(this));

    process.on('exit', this.exit.bind(this));
    process.on('SIGINT', this.exit.bind(this));
  }

  defineScreenElements() {
    this.scnMain = blessed.screen({
      dockBorders: true,
      smartCSR: true,
      terminal: process.platform === 'win32' ? 'windows-ansi' : 'xterm-256color',
      title: 'Node Terminal Trainer'
    });

    this.mainContainer = blessed.box({
      screen: this.scnMain,
      parent: this.scnMain,
      name: 'mainContainer',
      style: {
        bg: 'black'
      }
    });

    // this must be done right away to clear the terminal screen
    this.scnMain.render();

    this.splashScreen = new SplashScreen(this);

    const options = {
      chooseFolderOnly: true,
      title: ' Choose Workspace Folder '
    };
    this.workspaceChooser = new FileExplorer(Object.assign(options, this));
  }

  async exit() {
    if (this.autoSavedOnExit) {
      return;
    }
    this.autoSavedOnExit = true;

    try {
      await this.workspace.save();
    } catch (error) {
    }

    process.exit(0);
  }

  async enterWorkspace(
    {
      directory = this.initialCwd,
      showSplash = false
    } = {}
  ) {
    let splashTimer;
    if (showSplash) {
      splashTimer = setTimeout(() => this.splashScreen.show(), SPLASH_TIMEOUT);
    }

    try {
      await this.workspace.load({ directory });
    } catch (error) {
      try {
        await this.workspace.create({ directory });
        await this.workspace.load({ directory });
      } catch (error) {
        // @todo popup an info box, explaining why this is showing now
        // to use _onShow, FileExplorer must be a TabView / emit('show')
        this.workspaceChooser.show();
      }
    }

    if (showSplash) {
      clearTimeout(splashTimer);
      this.splashScreen.hide();
    }

    if (!this.workspaceChooser.visible) {
      this.workspaceExplorer = new WorkspaceExplorer(this);
      this.workspaceExplorer.show();
      this.workspaceExplorer.on('hide', this.exit.bind(this));
    }
  }

  scnMain_onKey(name, ch, key) {
    switch (name) {
      case 'exit':
        this.exit();
        break;
    }
  }

  async workspaceChooser_onAccept(directory) {
    try {
      await this.workspace.create({ directory });
      this.workspaceChooser.hide();
    } catch (error) {
      // @todo display error box
    }

    this.enterWorkspace({ directory });
  }
}

module.exports = {
  App,
};
