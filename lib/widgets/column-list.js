/**
 * This widget is a combination of a Box, containing a header Text line and a List of values.
 */

const blessed = require('blessed');
const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');

function ColumnList(
  {
    border = 'line',
    height = '100%-2',
    helpLines = [],
    hidden = false,
    keys = true,
    interactive = true,
    invertSelected = true,
    label = '',
    left = 0,
    name = '',
    padding = {
      left: 1,
      right: 1
    },
    parent = this.mainContainer,
    screen = this.scnMain,
    scrollable = true,
    scrollbar = {
      style: {
        fg: 'white',
        inverse: true
      },
      track: {
        ch: ':',
        fg: 'blue'
      }
    },
    style = {
      border: {
        fg: 'white'
      },
      focus: {
        border: {
          fg: 'blue'
        },
        selected: {
          bg: 'blue',
          fg: 'white'
        }
      },
      header: {
        bold: true,
        fg: 'white'
      },
      item: {
        fg: 'green'
      },
      selected: {
        bg: 'blue',
        fg: 'white'
      }
    },
    tabIndex,
    tags = true,
    top = 0,
    width = '100%-4'
  } = {}
) {
  EventEmitter.call(this);

  this.box = new blessed.Box({
    border,
    height,
    hidden,
    label,
    left,
    name,
    padding,
    parent,
    screen,
    style: {
      border: style.border,
      focus: {
        border: style.focus.border
      }
    },
    tags,
    top,
    width
  });

  this.header = new blessed.Text({
    height: 1,
    hidden,
    left: 0,
    name,
    parent: this.box,
    screen,
    style: style.header,
    tags,
    top: 0,
    width: '100%-4'
  });

  this.list = new blessed.List({
    height: '100%-3',
    helpLines,
    hidden,
    keys,
    interactive,
    invertSelected,
    left: 0,
    name,
    parent: this.box,
    screen,
    scrollable,
    scrollbar,
    style: {
      item: style.item,
      selected: style.selected,
      focus: {
        selected: style.focus.selected
      }
    },
    tabIndex,
    tags,
    top: 1,
    width: '100%-4'
  });

  Object.defineProperty(this, 'height', {
    get: () => this.box.height,
    set: (value) => this.box.height = value
  });

  Object.defineProperty(this, 'hidden', {
    get: () => this.box.hidden,
    set: (value) => value ? this.box.hide() : this.box.show()
  });

  Object.defineProperty(this, 'left', {
    get: () => this.box.left,
    set: (value) => this.box.left = value
  });

  Object.defineProperty(this, 'selected', {
    get: () => this.list.selected,
    set: (value) => this.list.selected = value
  });

  Object.defineProperty(this, 'top', {
    get: () => this.box.top,
    set: (value) => this.box.top = value
  });

  Object.defineProperty(this, 'width', {
    get: () => this.box.width,
    set: (value) => this.box.width = value
  });

  this.box.on('show', (...args) => {
    this.header.show();
    this.list.show();
    screen.render();
    this.emit('show', ...args);
  });

  this.list.key('space', (...args) => {
    this.list.enterSelected(this.list.selected);
  });

  this.list.on('blur', (...args) => {
    this.box.style = {
      border: style.border
    };
    screen.render();
    this.emit('blur', ...args);
  });

  this.list.on('focus', (...args) => {
    this.box.style = {
      border: style.focus.border
    };
    screen.render();
    this.emit('focus', ...args);
  });

  this.list.on('scroll', (...args) => {
    this.emit('scroll', ...args);
  });

  this.list.on('select', (...args) => {
    this.emit('select', ...args);
  });

  this.key = this.list.key.bind(this.list);
  this.select = this.list.select.bind(this.list);

  this.data = {};
}

ColumnList.prototype = Object.create(EventEmitter.prototype);

ColumnList.prototype.focus = function () {
  this.list.focus();
}

ColumnList.prototype.setRows = function (
  {
    align = [],
    padding = 2,
    rows = []
  }
) {
  const [header, ...items] = rows;

  const maxWidths = rows.reduce((prev, curr) => {
    for (const [index, value] of curr.entries()) {
      if (value.length > (prev[index] || 0)) {
        prev[index] = value.length;
      }
    }

    return prev;
  }, []);

  const alignColumns = (row) => {
    let lastAlignment;

    return row.reduce((prev, curr, index) => {
      switch (align[index]) {
        case 'right':
          prev += _.padStart(curr, maxWidths[index] + (index > 0 && lastAlignment !== 'left' ? padding : 0));
          break;
        case 'left':
        default:
          prev += _.padEnd(curr, maxWidths[index] + (index < maxWidths.length - 1 ? padding : 0));
          break;
      }

      lastAlignment = align[index] || 'left';

      return prev;
    }, '')
  }

  const listHeader = alignColumns(header);
  const listData = items.map(alignColumns);

  this.header.setContent(listHeader);
  this.list.setItems(listData);
}

ColumnList.prototype.show = function () {
  this.box.show();
  this.emit('show');
}

module.exports = {
  ColumnList
};
