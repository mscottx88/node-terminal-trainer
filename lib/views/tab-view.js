const blessed = require('blessed');
const EventEmitter = require('events').EventEmitter;

function TabView(
  {
    scnMain,
    parent,
    name,
    height = '100%',
    width = '100%',
    left = 0,
    top = 0,
    hidden = true,
    border = 'line',
    style = {
      border: { fg: 'white' }
    },
    label,
    padding = {
      left: 1,
      right: 1
    },
    tags = true,
    useTabIndex = true
  } = {}
) {
  EventEmitter.call(this);
  Object.assign(this, { scnMain, useTabIndex });

  this.sdiOptions = {
    screen: scnMain,
    parent,
    name,
    height,
    width,
    hidden,
    border,
    style,
    label,
    padding,
    tags,
    left,
    top
  };

  this.tabbableElements = new Set();
  this.tabOrder = [];

  if (this.useTabIndex) {
    this.tabFilter = ({ options: { tabIndex } }) => tabIndex !== -1;
    this.tabSorter = ({ options: { tabIndex: a } }, { options: { tabIndex: b } }) => a - b;
  }

  this.boundTabHandler = this.tabHandler.bind(this);

  TabView.prototype.construct.call(this);
}

TabView.prototype = Object.create(EventEmitter.prototype);

TabView.prototype.tabHandler = function () {
  if (this.tabbableElements.size === 0) {
    return;
  }

  for (let [index, element] of this.tabOrder.entries()) {
    if (this.scnMain.focused === element) {
      index = (index + 1) % this.tabOrder.length;
      this.tabOrder[index].focus();
      return;
    }
  }
}

TabView.prototype.addTabbableElement = function (
  {
    deferRefresh = false,
    element
  } = {}
) {
  if (this.useTabIndex && element.options.tabIndex === -1) {
    return;
  }

  if (!this.tabbableElements.has(element)) {
    element.key('tab', this.boundTabHandler);
    element.on('detach', () => {
      element.unkey('tab', this.boundTabHandler);
    });
  }

  this.tabbableElements.add(element);
  if (!deferRefresh) {
    this.refreshTabOrder();
  }
}

TabView.prototype.addTabbableElements = function (
  {
    elements = []
  } = {}
) {
  for (const element of elements) {
    this.addTabbableElement({ deferRefresh: true, element });
  }
  this.refreshTabOrder();
}

TabView.prototype.refreshTabOrder = function () {
  this.tabOrder = [...this.tabbableElements];

  if (typeof this.tabFilter === 'function') {
    this.tabOrder = this.tabOrder.filter(this.tabFilter);
  }

  if (this.tabOrder.length === 0) {
    return;
  }

  if (typeof this.tabSorter === 'function') {
    this.tabOrder = this.tabOrder.sort(this.tabSorter);
  }
}

TabView.prototype.removeTabbableElement = function (
  {
    element
  } = {}
) {
  if (this.tabbableElements.delete(element)) {
    this.refreshTabOrder();
    element.unkey('tab', this.boundTabHandler);
  }
}

TabView.prototype.construct = function () {
  TabView.prototype.defineScreenElements.call(this);
  TabView.prototype.defineEventHandlers.call(this);
}

TabView.prototype.defineScreenElements = function () {
  this.sdiRoot = blessed.box(this.sdiOptions);
}

TabView.prototype.defineEventHandlers = function () {
  this.sdiRoot.on('show', this.sdiRoot_onShow.bind(this));
}

TabView.prototype.show = function () {
  if (!this.sdiRoot.visible) {
    this.sdiRoot.show();
    this.scnMain.render();
  }
}

TabView.prototype.hide = function () {
  if (this.sdiRoot.visible) {
    this.sdiRoot.hide();
    this.scnMain.render();
  }
}

TabView.prototype.sdiRoot_onShow = function () {
  this.sdiRoot.setFront();
  if (this.tabOrder.length > 0) {
    this.tabOrder[0].focus();
  }
  this.scnMain.render();
}

module.exports = {
  TabView
};
