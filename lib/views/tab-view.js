// @todo get animate to work- seems like appending elements to the screen early causes issues
// might need to re-render all items or defer appending until visible

const blessed = require('blessed');
const EventEmitter = require('events').EventEmitter;
const os = require('os');

const ColumnList = require('../widgets/column-list').ColumnList;

const ANIMATE_INTERVAL = 50;

const WIDTH_ANIMATION_FRAMES = 3;
const HEIGHT_ANIMATION_FRAMES = 3;

class TabView extends EventEmitter {
  constructor(
    {
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
      parent,
      animate = false,
      escapable = true,
      modal = false,
      screen,
      showHelpArea = true,
      useTabIndex = true
    } = {}
  ) {
    super();

    Object.assign(this, { animate, escapable, modal, scnMain: screen, showHelpArea, useTabIndex });

    this.sdiOptions = {
      screen,
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

    this.escapableElements = new Set();
    this.helpableElements = new Set();

    this.tabbableElements = new Set();
    this.tabOrder = [];

    this.nextTabIndex = 0;

    if (this.useTabIndex) {
      this.tabFilter = ({ options: { tabIndex } }) => tabIndex !== -1;
      this.tabSorter = ({ options: { tabIndex: a } }, { options: { tabIndex: b } }) => a - b;
    }

    this.boundEscapeHandler = this.escapeHandler.bind(this);
    this.boundHelpHandler = this.helpHandler.bind(this);
    this.boundTabHandler = this.tabHandler.bind(this);

    TabView.prototype.construct.call(this);
  }

  get internalHeight() {
    return this.sdiArea.height;
  };
  get internalWidth() {
    return this.sdiArea.width;
  };

  addScreenElement(
    {
      definition,
      focusable = true,
      hasBorder = true,
      helpLines = [],
      name,
      parent,
      scrollable = false,
      type
    } = {}
  ) {
    definition.name = name;
    definition.parent = parent || this.sdiArea;
    definition.screen = this.scnMain;

    if (!definition.style) {
      definition.style = {};
    }

    if (focusable) {
      if (definition.tabIndex === undefined) {
        definition.tabIndex = this.nextTabIndex++;
      }

      if (!definition.style.focus) {
        definition.style.focus = {};
      }

      if (type === 'ListTable' || type === 'ColumnList') {
        if (!definition.style.cell) {
          definition.style.cell = {
            fg: 'green'
          };
        }

        if (!definition.style.item) {
          definition.style.item = {
            fg: 'green'
          };
        }

        if (!definition.selectedBg) {
          definition.selectedBg = 'white';
        }
        if (!definition.selectedFg) {
          definition.selectedFg = 'black';
        }

        if (!definition.style.selected) {
          definition.style.selected = {
            bg: 'white',
            fg: 'black'
          };
        }

        if (!definition.style.focus.selected) {
          definition.style.focus.selected = {
            bg: 'blue',
            fg: 'white'
          }
        }

        if (!definition.style.header) {
          definition.style.header = {
            bold: true,
            fg: 'white'
          }
        }
      } else if (type === 'Checkbox') {
        if (!definition.style.fg) {
          definition.style.fg = 'green';
        }

        if (!definition.style.focus.fg) {
          definition.style.focus.fg = 'white';
        }
        if (!definition.style.focus.bg) {
          definition.style.focus.bg = 'blue';
        }
      } else if (type !== 'Text') {
        if (!definition.style.fg) {
          definition.style.fg = 'black';
        }
        if (!definition.style.bg) {
          definition.style.bg = 'white';
        }

        if (!definition.style.focus.fg) {
          definition.style.focus.fg = 'white';
        }
        if (!definition.style.focus.bg) {
          definition.style.focus.bg = 'blue';
        }
      }
    }

    if (type === 'Text') {
      if (!definition.style.fg) {
        definition.style.fg = 'green';
      }
    }

    if (hasBorder) {
      if (!definition.border) {
        definition.border = 'line';
      }

      if (!definition.style.border) {
        definition.style.border = {
          fg: 'white'
        };
      }

      if (focusable && !definition.style.focus.border) {
        definition.style.focus.border = {
          fg: 'blue'
        };
      }
    }

    if (scrollable) {
      if (!definition.scrollable) {
        definition.scrollable = true;
      }

      if (!definition.scrollbar) {
        definition.scrollbar = {
          style: {
            fg: 'white',
            inverse: true,
            track: {
              ch: ':',
              fg: 'blue'
            }
          },
          track: {
            ch: ':',
            fg: 'blue'
          }
        };
      }

      if (!definition.style.scrollbar) {
        definition.style.scrollbar = {
          fg: 'white',
          inverse: true,
          track: {
            ch: ':',
            fg: 'blue'
          }
        };
      }

      if (!definition.track) {
        definition.track = {
          ch: ':',
          fg: 'blue'
        };
      }
    }

    if (type === 'Button') {
      if (!definition.height) {
        definition.height = 3;
      }
    }

    definition.helpLines = helpLines;

    if (type === 'ColumnList') {
      this[name] = new ColumnList(definition);
    } else {
      this[name] = new blessed[type](definition);
    }
  }

  escapeHandler() {
    this.hide();
  }

  helpHandler() {
    let content;

    if (this.scnMain.focused && this.scnMain.focused.options.helpLines) {
      content = this.scnMain.focused.options.helpLines.join(os.EOL);
    }
    if (!content) {
      content = 'Help not defined for this element';
    }

    this.txtHelp.setContent(content);
  }

  tabHandler() {
    if (this.tabbableElements.size === 0) {
      return;
    }

    for (let [index, element] of this.tabOrder.entries()) {
      if (this.scnMain.focused === element) {
        do {
          index = (index + 1) % this.tabOrder.length;
        } while (!this.tabOrder[index].visible && this.tabOrder[index] !== element);
        this.tabOrder[index].focus();
        this.emit('tab', { previous: element, current: this.tabOrder[index] });
        return;
      }
    }
  }

  focusFirst() {
    if (this.tabbableElements.size === 0) {
      return;
    }

    for (let [index, element] of this.tabOrder.entries()) {
      if (this.tabOrder[index].visible) {
        this.tabOrder[index].focus();
        return;
      }
    }
  }

  addTabbableElement(
    {
      deferRefresh = false,
      element
    } = {}
  ) {
    if (this.useTabIndex && !(element.options && element.options.tabIndex > -1)) {
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

  addTabbableElements(
    {
      elements = []
    } = {}
  ) {
    for (const element of elements) {
      this.addTabbableElement({ deferRefresh: true, element });
    }
    this.refreshTabOrder();
  }

  animateOpen() {
    return new Promise((resolve, reject) => {
      const finalHeight = this.sdiRoot.height;
      const finalWidth = this.sdiRoot.width;

      let animationFrames = 0;

      this.sdiRoot.height = 3;
      this.sdiRoot.width = finalWidth / WIDTH_ANIMATION_FRAMES;
      this.scnMain.render();

      const widthSlider = setInterval(() => {
        this.sdiRoot.width += finalWidth / WIDTH_ANIMATION_FRAMES;

        if (this.sdiRoot.width >= finalWidth || ++animationFrames >= WIDTH_ANIMATION_FRAMES) {
          this.sdiRoot.width = finalWidth;
          clearInterval(widthSlider);

          animationFrames = 0;

          const heightSlider = setInterval(() => {
            this.sdiRoot.height += finalHeight / HEIGHT_ANIMATION_FRAMES;

            if (this.sdiRoot.height >= finalHeight || ++animationFrames >= HEIGHT_ANIMATION_FRAMES) {
              this.sdiRoot.height = finalHeight;
              clearInterval(heightSlider);

              resolve();
            }

            this.scnMain.render();
          }, ANIMATE_INTERVAL);
        }

        this.scnMain.render();
      }, ANIMATE_INTERVAL);
    });
  }

  makeElementEscapable(
    {
      element
    } = {}
  ) {
    if (!this.escapableElements.has(element)) {
      element.key('escape', this.boundEscapeHandler);
      element.on('detach', () => {
        element.unkey('tab', this.boundEscapeHandler);
      });
    }
  }

  makeElementHelpable(
    {
      element
    } = {}
  ) {
    if (!this.escapableElements.has(element)) {
      element.on('focus', this.boundHelpHandler);
      element.on('detach', () => {
        element.removeListener('focus', this.boundHelpHandler);
      });
    }
  }

  refreshTabOrder() {
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

  removeTabbableElement(
    {
      element
    } = {}
  ) {
    if (this.tabbableElements.delete(element)) {
      this.refreshTabOrder();
      element.unkey('tab', this.boundTabHandler);
    }
  }

  setElementTabIndex(
    {
      element,
      tabIndex = -1
    } = {}
  ) {
    if (!element.options) {
      element.options = {}
    }

    element.options.tabIndex = tabIndex;

    if (element.options.tabIndex === -1) {
      this.removeTabbableElement({ element });
    } else {
      this.addTabbableElement({ element });
    }
  }

  construct() {
    TabView.prototype.defineScreenElements.call(this);
    TabView.prototype.defineEventHandlers.call(this);
  }

  defineScreenElements() {
    this.sdiRoot = blessed.box(this.sdiOptions);

    this.sdiArea = new blessed.Box({
      screen: this.scnMain,
      parent: this.sdiRoot,
      height: `100%${this.showHelpArea ? '-8' : '-2'}`
    });

    if (this.showHelpArea) {
      TabView.prototype.addScreenElement.call(this, {
        definition: {
          keys: true,
          tags: true,
          padding: {
            left: 1,
            right: 1
          },
          label: ' Help ',
          top: '100%-8',
          height: 6,
          width: this.internalWidth
        },
        focusable: false,
        name: 'txtHelp',
        parent: this.sdiRoot,
        type: 'Text'
      });
    }
  }

  defineEventHandlers() {
    this.scnMain.on('resize', this.scnMain_onResize.bind(this));
    this.sdiArea.on('adopt', this.sdiArea_onAdopt.bind(this));
    this.sdiRoot.on('hide', this.sdiRoot_onHide.bind(this));
    this.sdiRoot.on('show', this.sdiRoot_onShow.bind(this));
  }

  show() {
    if (!this.sdiRoot.visible) {
      this.sdiRoot.show();
      this.scnMain.render();
      this.emit('show');
    }
  }

  hide() {
    if (this.sdiRoot.visible) {
      this.sdiRoot.hide();
      this.scnMain.render();
      this.emit('hide');
    }
  }

  scnMain_onResize() {
    if (this.showHelpArea) {
      this.txtHelp.height = 6;
      this.txtHelp.top = `100%-${this.txtHelp.height + 2}`;
      this.txtHelp.width = this.internalWidth;
    }
    if (this.layoutElements) {
      this.layoutElements();
    }
    this.scnMain.render();
  }

  sdiArea_onAdopt(element) {
    if (this.useTabIndex) {
      this.addTabbableElement({ element });
    }
    if (this.escapable) {
      this.makeElementEscapable({ element });
    }
    if (this.showHelpArea) {
      this.makeElementHelpable({ element });
    }
    element.on('adopt', this.sdiArea_onAdopt.bind(this));
  }

  sdiRoot_onHide() {
    if (this.modal) {
      this.scnMain.restoreFocus();
    }
  }

  async sdiRoot_onShow() {
    if (this.animate) {
      await this.animateOpen();
    }

    if (this.modal) {
      this.scnMain.saveFocus();
    }

    this.sdiRoot.setFront();
    this.focusFirst();
    this.scnMain.render();
  }
}

module.exports = {
  TabView
};
