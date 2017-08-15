const blessed = require('blessed');
const EventEmitter = require('events').EventEmitter;

function SplashScreen(
  {
    mainContainer,
    scnMain
  } = {}
) {
  EventEmitter.call(this);
  Object.assign(this, { mainContainer, scnMain });

  this.construct();
}

SplashScreen.prototype = Object.create(EventEmitter.prototype);

SplashScreen.prototype.defineScreenElements = function () {
  this.sdiRoot = blessed.box({
    screen: this.scnMain,
    parent: this.mainContainer,
    name: 'splash',
    border: 'line',
    height: '60%',
    hidden: true,
    label: ' Welcome ',
    padding: {
      bottom: 1,
      left: 1,
      right: 1,
      top: 1
    },
    style: {
      border: {
        fg: 'white'
      }
    },
    tags: true,
    width: '50%',
    content: 'Loading, please wait ...'
  });
}

SplashScreen.prototype.defineEventHandlers = function () {
  this.sdiRoot.on('hide', this.sdiRoot_onHide.bind(this));
  this.sdiRoot.on('show', this.sdiRoot_onShow.bind(this));
}

SplashScreen.prototype.construct = function () {
  this.defineScreenElements();
  this.defineEventHandlers();
}

SplashScreen.prototype.hide = function () {
  if (this.sdiRoot.visible) {
    this.sdiRoot.hide();
    this.scnMain.render();
  }
}

SplashScreen.prototype.show = function () {
  if (!this.sdiRoot.visible) {
    this.sdiRoot.show();
    this.scnMain.render();
  }
}

SplashScreen.prototype.sdiRoot_onHide = function () {
  this.scnMain.restoreFocus();
  this.scnMain.render();

  this.emit('hide');
}

SplashScreen.prototype.sdiRoot_onShow = function () {
  this.scnMain.saveFocus();
  this.sdiRoot.setFront();
  this.sdiRoot.focus();
  this.scnMain.render();
}

module.exports = {
  SplashScreen
};
