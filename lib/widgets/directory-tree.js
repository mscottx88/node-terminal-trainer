const blessed = require('blessed');
const contrib = require('blessed-contrib');
const EventEmitter = require('events').EventEmitter;
const fs = require('fs');
const path = require('path');
const util = require('util');
const _ = require('lodash');

const readdirAsync = util.promisify(fs.readdir);

class DirectoryTree extends EventEmitter {
  constructor(
    {
      border = 'line',
      height = '100%-2',
      helpLines = [],
      hidden = false,
      keys = true,
      interactive = true,
      invertSelected = true,
      label = ' Directory ',
      left = 0,
      name = '',
      padding = {
        right: 1
      },
      parent,
      screen,
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
        selected: {
          bg: 'white',
          fg: 'black'
        }
      },
      tabIndex,
      tags = true,
      template = {
        lines: true,
        extend: ' ',
        retract: ' '
      },
      top = 0,
      width = '30%-1'
    } = {}
  ) {
    super();

    Object.assign(this, { screen });

    this.tvwDirectories = new contrib.tree({
      border,
      label,
      name,
      padding,
      parent,
      screen,
      style: {
        border: style.border,
        scrollbar: {},
        track: scrollbar.track
      },
      tabIndex: 0,
      tags,
      template,
      top,
      width
    });

    this.tvwDirectories.rows.position.top = 0;
    this.tvwDirectories.rows.scrollable = scrollable;
    this.tvwDirectories.rows.scrollbar = true;
    this.tvwDirectories.rows.style.scrollbar = scrollbar.style;
    this.tvwDirectories.rows.track = scrollbar.track;

    this.tvwDirectories.on('show', (...args) => {
      this.emit('show', ...args);
    });

    this.tvwDirectories.rows.on('blur', (...args) => {
      this.tvwDirectories.style.border = style.border;
      this.tvwDirectories.rows.style.selected = style.selected;
      screen.render();
      this.emit('blur', ...args);
    });

    this.tvwDirectories.rows.on('focus', (...args) => {
      this.tvwDirectories.style.border = style.focus.border;
      this.tvwDirectories.rows.style.selected = style.focus.selected;
      screen.render();
      this.emit('focus', ...args);
    });

    this.tvwDirectories.on('select', (...args) => {
      this.emit('select', ...args);
    });

    this.screen.on('resize', () => {
      this.loadAllVisibleElementMore();
    });

    this.getScroll = this.tvwDirectories.rows.getScroll.bind(this.tvwDirectories.rows);
    this.focus = this.tvwDirectories.focus.bind(this.tvwDirectories);
    this.key = this.tvwDirectories.rows.key.bind(this.tvwDirectories.rows);
    this.resetScroll = this.tvwDirectories.rows.resetScroll.bind(this.tvwDirectories.rows);
    this.scrollTo = this.tvwDirectories.rows.scrollTo.bind(this.tvwDirectories.rows);
    this.select = this.tvwDirectories.rows.select.bind(this.tvwDirectories.rows);
    this.setData = this.tvwDirectories.setData.bind(this.tvwDirectories);
  }

  get data() {
    return this.tvwDirectories.data;
  }

  get height() {
    return this.tvwDirectories.height;
  }
  set height(value) {
    this.tvwDirectories.height = value;
  }

  get hidden() {
    return this.tvwDirectories.hidden;
  }
  set hidden(value) {
    value ? this.tvwDirectories.hide() : this.tvwDirectories.show();
  }

  get left() {
    return this.tvwDirectories.left;
  }
  set left(value) {
    this.tvwDirectories.left = value;
  }

  get nodeLines() {
    return this.tvwDirectories.nodeLines;
  }

  get rows() {
    return this.tvwDirectories.rows;
  }

  get selected() {
    return this.tvwDirectories.rows.selected;
  }
  set selected(value) {
    this.tvwDirectories.rows.selected = value;
  }

  get top() {
    return this.tvwDirectories.top;
  }
  set top(value) {
    this.tvwDirectories.top = value;
  }

  get width() {
    return this.tvwDirectories.width;
  }
  set width(value) {
    this.tvwDirectories.width = value;
  }

  static extendAllElementAncestors(element) {
    let pointer = element;
    while (pointer.parent) {
      pointer = pointer.parent;
      pointer.extended = true;
    }
  }

  static async getDirectoryData(directory) {
    function* isDirectories(items) {
      for (const item of items) {
        yield new Promise((resolve, reject) => {
          fs.lstat(`${directory}/${item}`, (error, stats) => {
            if (error) {
              resolve(undefined);
            } else {
              resolve(stats.isDirectory());
            }
          })
        });
      }
    }

    const data = {
      directories: [],
      files: [],
      fileNames: []
    };

    try {
      const files = await readdirAsync(directory, 'utf8');
      const areDirectories = await Promise.all(isDirectories(files));

      for (const [index, file] of files.entries()) {
        let highlight;
        if (areDirectories[index] === undefined) {
          highlight = '{red-fg}';
        } else {
          highlight = areDirectories[index] ? '{cyan-fg}' : '{green-fg}';
        }

        const item = {
          name: `${highlight}${file}{/}`,
          path: path.normalize(directory === '/' ? `/${file}` : `${directory}/${file}`),
          extended: false,
          isDirectory: areDirectories[index],
          loaded: !areDirectories[index],
        };

        if (!item.loaded) {
          item.children = [{
            name: '{green-fg}loading ...{/}',
            extended: false,
            parent: item
          }];
        }

        if (item.isDirectory) {
          data.directories.push(item);
        } else {
          data.files.push(item);
          data.fileNames.push(item.name);
        }
      }
    } catch (error) {
    }

    return data;
  }

  static getElementIndex(element, root) {
    let index = 0;
    let found;

    function search(pointer) {
      if (found) {
        return;
      }

      if (pointer.path === element.path) {
        found = true;
        return;
      }

      index++;

      if (pointer.children && pointer.extended) {
        for (const child of pointer.children) {
          search(child);
        }
      }
    }

    search(root);

    return index;
  }

  elementLoadMore(element) {
    const nextIndex = element.parent.children.length - 1;

    element.parent.children.splice(
      -1, // start with the last element (it is the dummy more...)
      1,  // delete it
      ...element.parent.directories.slice( // now add the next page
        nextIndex,
        nextIndex + this.tvwDirectories.rows.height
      )
    );

    if (element.parent.children.length < element.parent.directories.length) {
      element.parent.children.push({
        name: '{green-fg}more ...{/}',
        isMore: true
      });
    }

    this.refreshTreeData();
  }

  async ensureElementLoaded(element) {
    if (!element.loaded && element.isDirectory) {
      element.extended = true;
      element.loaded = true;

      this.refreshTreeData();
      this.ensureElementVisible();

      const { directories, files, fileNames } = await DirectoryTree.getDirectoryData(element.path);

      element.directories = directories;
      element.files = files;
      element.fileNames = fileNames;

      element.children = directories.slice(0, this.tvwDirectories.rows.height);
      if (element.children.length < directories.length) {
        element.children.push({
          name: '{green-fg}more ...{/}',
          isMore: true
        });
      }

      this.refreshTreeData();
      this.ensureElementVisible();
    }
  }

  ensureElementVisible(index = this.tvwDirectories.rows.selected) {
    let scroll = index + this.tvwDirectories.rows.height - 1;
    if (scroll >= this.tvwDirectories.nodeLines.length) {
      scroll -= scroll - this.tvwDirectories.nodeLines.length + 1;
    }
    if (this.tvwDirectories.rows.getScroll() !== scroll) {
      this.tvwDirectories.rows.resetScroll();
      this.tvwDirectories.rows.scrollTo(scroll);

      this.loadAllVisibleElementMore();
    }
    this.screen.render();
  }

  findTreeElement(name) {
    if (process.platform === 'win32') {
      if (name.toLowerCase() === this.tvwDirectories.data.path.toLowerCase()) {
        return [this.tvwDirectories.data];
      }
    } else {
      if (name === this.tvwDirectories.data.path) {
        return [this.tvwDirectories.data];
      }
    }

    let closestElement;
    let foundElement;

    function search(node) {
      for (const item of node) {
        if (foundElement) {
          return;
        }

        if (process.platform === 'win32') {
          if (item.path && item.path.toLowerCase() === name.toLowerCase()) {
            foundElement = item;
            return;
          }

          if (!foundElement && item.path && name.toLowerCase().indexOf(item.path.toLowerCase()) === 0) {
            closestElement = item;
            if (item.directories) {
              search(item.directories);
            }
          }
        } else {
          if (item.path === name) {
            foundElement = item;
            return;
          }

          if (!foundElement && name.indexOf(item.path) === 0) {
            closestElement = item;
            if (item.directories) {
              search(item.directories);
            }
          }
        }
      }
    }

    search(this.tvwDirectories.data.directories);

    return [foundElement, closestElement];
  }

  loadAllVisibleElementMore() {
    const first = this.tvwDirectories.rows.selected;
    const last = _.clamp(
      this.tvwDirectories.rows.selected + this.tvwDirectories.rows.height,
      0,
      this.tvwDirectories.nodeLines.length - 1
    );

    for (let index = first; index <= last; index++) {
      const element = this.tvwDirectories.nodeLines[index];
      if (element.isMore) {
        this.elementLoadMore(element);
        this.ensureElementVisible(first);
      }
    }
  }

  refreshTreeData() {
    // hack-fix; the mechanism where selected gets changed is flawed internally in blessed.List
    const selected = this.tvwDirectories.rows.selected;
    this.tvwDirectories.setData(this.tvwDirectories.data);
    this.tvwDirectories.rows.selected = selected;
    this.screen.render();
  }

  async seedWithRoot() {
    const root = path.parse(process.cwd()).root;
    const { directories, files, fileNames } = await DirectoryTree.getDirectoryData(root);
    const normalized = path.normalize(root);
    this.tvwDirectories.setData({
      name: `{cyan-fg}${normalized}{/}`,
      path: normalized,
      extended: true,
      directories: directories,
      children: directories,
      files: files,
      fileNames: fileNames
    });
  }

  show() {
    this.tvwDirectories.show();
    this.emit('show');
  }
}

module.exports = {
  DirectoryTree
};
