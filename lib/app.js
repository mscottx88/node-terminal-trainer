const blessed = require('blessed');
const EventEmitter = require('events').EventEmitter;

const FileExplorer = require('./views/file-explorer').FileExplorer;
const SplashScreen = require('./views/splash-screen').SplashScreen;
const Workspace = require('./providers/workspace').Workspace;
const WorkspaceExplorer = require('./views/workspace-explorer').WorkspaceExplorer;

const HEARTBEAT_INTERVAL = 5000;
const SPLASH_TIMEOUT = 500;

function App() {
  EventEmitter.call(this);

  setInterval(() => { }, HEARTBEAT_INTERVAL);

  this.initialCwd = process.cwd();

  this.workspace = new Workspace(this);

  this.construct();
  this.enterWorkspace({ showSplash: true });
}

App.prototype = Object.create(EventEmitter.prototype);

App.prototype.construct = async function () {
  this.defineScreenElements();
  this.defineEventHandlers();
}

App.prototype.defineEventHandlers = function () {
  this.scnMain.ignoreLocked = ['C-c'];
  this.scnMain.key('C-c', this.scnMain_onKey.bind(this, 'exit'));

  this.workspaceChooser.on('accept', this.workspaceChooser_onAccept.bind(this));

  process.on('exit', this.exit.bind(this));
  process.on('SIGINT', this.exit.bind(this));
}

App.prototype.defineScreenElements = function () {
  this.scnMain = blessed.screen({
    dockBorders: true,
    smartCSR: true,
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

App.prototype.exit = async function () {
  try {
    await this.workspace.save();
  } catch (error) {
  }

  process.exit(0);
}

App.prototype.enterWorkspace = async function (
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

App.prototype.scnMain_onKey = function (name, ch, key) {
  switch (name) {
    case 'exit':
      this.exit();
      break;
  }
}

App.prototype.workspaceChooser_onAccept = async function (directory) {
  try {
    await this.workspace.create({ directory });
    this.workspaceChooser.hide();
  } catch (error) {
    // @todo display error box
  }

  this.enterWorkspace({ directory });
}

module.exports = {
  App,
};
