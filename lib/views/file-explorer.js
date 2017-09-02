const blessed = require('blessed');
const contrib = require('blessed-contrib');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const util = require('util');

const TabView = require('./tab-view').TabView;

const accessAsync = util.promisify(fs.access);
const readdirAsync = util.promisify(fs.readdir);

class FileExplorer extends TabView {
  constructor(
    {
      chooseFolderOnly = false,
      cwd = process.cwd(),
      mainContainer,
      scnMain,
      title = ' File Explorer '
    } = {}
  ) {
    super({
      height: '80%',
      label: title,
      left: 'center',
      modal: true,
      name: 'fileExplorer',
      parent: mainContainer,
      screen: scnMain,
      top: 'center',
      width: '70%'
    });

    Object.assign(this, { chooseFolderOnly, cwd, mainContainer, scnMain, title });

    this.construct();
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

  async seedWithRoot() {
    const root = path.parse(process.cwd()).root;
    const { directories, files, fileNames } = await FileExplorer.getDirectoryData(root);
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

  async loadCwd() {
    if (!this.cwd) {
      return;
    }

    this.txtPath.setValue(this.cwd);
    await this.txtPath_onSubmit();
  }

  refreshTreeData() {
    // hack-fix; the mechanism where selected gets changed is flawed internally in blessed.List
    const selected = this.tvwDirectories.rows.selected;
    this.tvwDirectories.setData(this.tvwDirectories.data);
    this.tvwDirectories.rows.selected = selected;
    this.scnMain.render();
  }

  defineScreenElements() {
    this.addScreenElement({
      definition: {
        label: ' Path ',
        tabIndex: 3,
        top: 0,
        width: this.internalWidth
      },
      name: 'txtPath',
      type: 'Textbox'
    });

    this.tvwDirectories = contrib.tree({
      screen: this.scnMain,
      parent: this.sdiArea,
      name: 'fileExplorer::tree',
      template: {
        lines: true,
        extend: ' ',
        retract: ' '
      },
      tags: true,
      width: '30%-1',
      border: 'line',
      label: ' Directory ',
      padding: {
        right: 1
      },
      style: {
        border: {
          fg: 'blue'
        },
        scrollbar: {},
        track: {
          ch: ':',
          fg: 'blue'
        }
      },
      tabIndex: 0,
      top: 3
    });

    this.tvwDirectories.rows.position.top = 0;

    this.tvwDirectories.rows.scrollable = true;
    this.tvwDirectories.rows.scrollbar = true;
    this.tvwDirectories.rows.style.scrollbar = {
      fg: 'white',
      inverse: true
    };
    this.tvwDirectories.rows.track = {
      ch: ':',
      fg: 'blue'
    };

    const width = this.internalWidth - this.tvwDirectories.width - 2;

    this.lstContents = blessed.list({
      screen: this.scnMain,
      parent: this.sdiArea,
      name: 'fileExplorer::list',
      keys: true,
      interactive: true,
      invertSelected: true,
      scrollable: true,
      width,
      left: '30%-1',
      height: `100%-${5 + (this.chooseFolderOnly ? 3 : 0)}`,
      top: 3,
      tags: true,
      border: 'line',
      label: ' Contents ',
      style: {
        selected: {
          bg: 'white',
          fg: 'black'
        },
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
        }
      },
      scrollbar: {
        style: {
          fg: 'white',
          inverse: true
        },
        track: {
          ch: ':',
          fg: 'blue'
        }
      },
      padding: {
        left: 1,
        right: 1
      },
      tabIndex: 1
    });

    if (this.chooseFolderOnly) {
      this.btnChooseFolder = blessed.button({
        screen: this.scnMain,
        parent: this.sdiArea,
        top: '100%-5',
        height: 3,
        width,
        left: '30%-1',
        name: 'accept',
        content: 'Choose Folder',
        align: 'center',
        style: {
          fg: 'black',
          bg: 'white',
          focus: {
            bg: 'blue',
            fg: 'white',
            border: {
              fg: 'blue'
            }
          },
          border: {
            fg: 'white'
          }
        },
        border: 'line',
        tabIndex: 2
      });
    }
  }

  layoutElements() {
    this.txtPath.top = 0;
    this.txtPath.width = this.internalWidth;

    this.tvwDirectories.width = '30%';
    this.tvwDirectories.top = this.txtPath.height;

    this.lstContents.top = this.txtPath.height;
    this.lstContents.left = this.tvwDirectories.width;
    this.lstContents.width = this.internalWidth - this.tvwDirectories.width;
    this.lstContents.height = this.internalHeight - this.txtPath.height;

    if (this.chooseFolderOnly) {
      this.lstContents.height -= this.btnChooseFolder.height;

      this.btnChooseFolder.width = this.lstContents.width;
      this.btnChooseFolder.top = this.lstContents.top + this.lstContents.height;
      this.btnChooseFolder.left = this.lstContents.left;
    }
  }

  setContentList({ path, fileNames = [] }) {
    this.loadedContentPath = path;

    this.lstContents.clearItems();
    this.lstContents.select(0);
    this.lstContents.resetScroll();
    this.lstContents.setItems(fileNames);
    this.scnMain.render();
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
    this.scnMain.render();
  }

  async ensureElementLoaded(element) {
    if (!element.loaded && element.isDirectory) {
      element.extended = true;
      element.loaded = true;

      this.refreshTreeData();
      this.ensureElementVisible();

      const { directories, files, fileNames } = await FileExplorer.getDirectoryData(element.path);

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

  static extendAllElementAncestors(element) {
    let pointer = element;
    while (pointer.parent) {
      pointer = pointer.parent;
      pointer.extended = true;
    }
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

  btnChooseFolder_onPress() {
    this.emit('accept', path.normalize(this.loadedContentPath));
  }

  lstContents_onSelect(element, index) {
    const fileName = blessed.cleanTags(element.content);
    this.emit('accept', path.normalize(`${this.loadedContentPath}/${fileName}`));
  }

  // move to ColumnList, make lstContents a ColumnList
  lstContents_onKeys(names, ch, key) {
    const scroll = (this.lstContents.height - 1) * (key.full === 'pageup' ? -1 : 1);

    this.lstContents.selected =
      _.clamp(this.lstContents.selected + scroll, 0, this.lstContents.getScrollHeight() - 1);

    this.lstContents.resetScroll();
    this.lstContents.scrollTo(this.lstContents.selected);
    this.scnMain.render();
  }

  scnMain_onResize() {
    super.scnMain_onResize();
    this.loadAllVisibleElementMore();
  }

  // move to overload
  tvwDirectories_onBlur() {
    this.tvwDirectories.style.border.fg = 'white';
    this.tvwDirectories.rows.style.selected.bg = 'white';
    this.tvwDirectories.rows.style.selected.fg = 'black';
    this.scnMain.render();
  }

  // move to overload
  tvwDirectories_onFocus() {
    this.tvwDirectories.style.border.fg = 'blue';
    this.tvwDirectories.rows.style.selected.bg = 'blue';
    this.tvwDirectories.rows.style.selected.fg = 'white';
    this.scnMain.render();
  }

  // removable, when tabIndex and escapable is set and Tree overloaded similar to ColumnList
  tvwDirectories_onKey(name, ch, key) {
    switch (name) {
      case 'escape':
        this.hide();
        break;
      case 'tab':
        this.lstContents.focus();
        this.scnMain.render();
        break;
    }
  }

  // move to overload
  async tvwDirectories_onKeys(names, ch, key) {
    switch (key.full) {
      case 'pageup':
      case 'pagedown':
        {
          // @todo just need to add cursor-sensitive scrolling now
          const direction = key.full === 'pageup' ? -1 : 1;
          const scroll = (this.tvwDirectories.rows.height - 1) * direction;
          const currentSelection = this.tvwDirectories.rows.selected;
          let selected = _.clamp(currentSelection + scroll, 0, this.tvwDirectories.nodeLines.length - 1);
          const landedOnElement = this.tvwDirectories.nodeLines[selected];
          const isLastElement = selected === this.tvwDirectories.nodeLines.length - 1;

          let first = currentSelection;
          let last = selected;

          if (first > last) {
            [first, last] = [last, first];
          }

          for (let index = first; index <= last; index++) {
            if (this.tvwDirectories.nodeLines[index].isMore) {
              this.tvwDirectories.rows.select(index);
              selected = _.clamp(currentSelection + scroll, 0, this.tvwDirectories.nodeLines.length - 1);
            }
          }

          this.tvwDirectories.rows.select(selected);
          this.tvwDirectories.rows.resetScroll();
          this.tvwDirectories.rows.scrollTo(this.tvwDirectories.rows.selected);

          this.scnMain.render();
        }
        break;
      case 'left':
        {
          const element = this.tvwDirectories.nodeLines[this.tvwDirectories.rows.selected];
          if (element.extended) {
            element.extended = false;
            this.refreshTreeData();
            return;
          }

          const parent = element.parent || this.tvwDirectories.data;
          this.tvwDirectories.rows.selected = FileExplorer.getElementIndex(parent, this.tvwDirectories.data);
          parent.extended = false;
          this.refreshTreeData();
          await this.tvwDirectories_onSelect(parent);
        }
        break;
      case 'right':
        {
          const element = this.tvwDirectories.nodeLines[this.tvwDirectories.rows.selected];
          element.extended = true;
          this.refreshTreeData();
          await this.tvwDirectories_onSelect(element);
        }
        break;
    }
  }

  // move to overload
  tvwDirectories_onScroll() {
    const element = this.tvwDirectories.nodeLines[this.tvwDirectories.rows.selected];
    if (element.isMore) {
      this.elementLoadMore(element);
    }
  }

  async tvwDirectories_onSelect(element) {
    this.txtPath.setValue(element.path || element.name);
    this.ensureElementVisible();

    if (element.isDirectory && !element.loaded) {
      await this.ensureElementLoaded(element);
    }

    this.setContentList(element);
  }

  txtPath_onKeypress(ch, key) {
    if (key.full === 'enter') {
      this.txtPath.submit();
      this.tvwDirectories.focus();
      this.scnMain.render();
    }
  }

  async txtPath_onSubmit() {
    this.txtPath.setValue(path.normalize(this.txtPath.getValue() || path.sep));
    const value = this.txtPath.getValue();

    try {
      await accessAsync(value);

      let [foundElement, closestElement] = this.findTreeElement(value);

      if (!foundElement && closestElement) {
        let done;
        async function loadAllMissing(pointer) {
          if (done) {
            return;
          }

          const compareValue = process.platform === 'win32' ? value.toLowerCase() : value;
          const comparePointerPath = process.platform === 'win32' && pointer.path ? pointer.path.toLowerCase() : '';

          if (compareValue.indexOf(comparePointerPath) !== 0) {
            return;
          }

          const index = FileExplorer.getElementIndex(pointer, this.tvwDirectories.data);
          this.tvwDirectories.rows.selected = index;
          await this.ensureElementLoaded(pointer);

          closestElement = pointer;
          if (compareValue === comparePointerPath) {
            foundElement = pointer;
            done = true;
            return;
          }

          for (let childIndex = 0; childIndex < pointer.children.length; childIndex++) {
            if (pointer.children[childIndex].isMore) {
              this.elementLoadMore(pointer.children[childIndex]);
            }

            await loadAllMissing.call(this, pointer.children[childIndex]);

            if (done) {
              return;
            }
          }
        }

        FileExplorer.extendAllElementAncestors(closestElement);
        await loadAllMissing.call(this, closestElement);
      }

      const positionElement = foundElement || closestElement;
      if (positionElement) {
        FileExplorer.extendAllElementAncestors(positionElement);
        this.refreshTreeData();

        const index = FileExplorer.getElementIndex(positionElement, this.tvwDirectories.data);
        this.tvwDirectories.rows.selected = index;
        this.tvwDirectories_onSelect(positionElement);
      }
    } catch (error) {

    }
  }

  defineEventHandlers() {
    if (this.chooseFolderOnly) {
      this.btnChooseFolder.on('press', this.btnChooseFolder_onPress.bind(this));
    } else {
      this.lstContents.on('select', this.lstContents_onSelect.bind(this));
    }

    this.lstContents.key(['pageup', 'pagedown'], this.lstContents_onKeys.bind(this, ['pageup', 'pagedown']));

    this.tvwDirectories.on('select', this.tvwDirectories_onSelect.bind(this));
    this.tvwDirectories.rows.on('blur', this.tvwDirectories_onBlur.bind(this));
    this.tvwDirectories.rows.on('focus', this.tvwDirectories_onFocus.bind(this));
    this.tvwDirectories.rows.on('scroll', this.tvwDirectories_onScroll.bind(this));

    // to make this removable, we need to overload the Tree similar to ColumnList
    this.tvwDirectories.rows.key('escape', this.tvwDirectories_onKey.bind(this, 'escape'));
    this.tvwDirectories.rows.key('tab', this.tvwDirectories_onKey.bind(this, 'tab'));
    this.tvwDirectories.rows.key(['pageup', 'pagedown'], this.tvwDirectories_onKeys.bind(this, ['pageup', 'pagedown']));
    this.tvwDirectories.rows.key(['left', 'right'], this.tvwDirectories_onKeys.bind(this, ['left', 'right']));

    this.txtPath.on('keypress', this.txtPath_onKeypress.bind(this));
    this.txtPath.on('submit', this.txtPath_onSubmit.bind(this));
  }

  async construct() {
    this.defineScreenElements();
    this.defineEventHandlers();

    await this.seedWithRoot();
    await this.loadCwd();
  }
}

module.exports = {
  FileExplorer
};
