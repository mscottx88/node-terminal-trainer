const blessed = require('blessed');
const contrib = require('blessed-contrib');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const util = require('util');

const accessAsync = util.promisify(fs.access);
const readdirAsync = util.promisify(fs.readdir);

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

function FileExplorer(
  {
    chooseFolderOnly,
    cwd = process.cwd(),
    mainContainer,
    scnMain,
    title = ' File Explorer '
  } = {}
) {
  EventEmitter.call(this);
  Object.assign(this, { chooseFolderOnly, cwd, mainContainer, scnMain, title });

  construct.call(this);
}

FileExplorer.prototype = Object.create(EventEmitter.prototype);

FileExplorer.prototype.show = function () {
  if (!this.sdiRoot.visible) {
    this.sdiRoot.show();
    this.scnMain.render();
  }
}

FileExplorer.prototype.hide = function () {
  if (this.sdiRoot.visible) {
    this.sdiRoot.hide();
    this.scnMain.render();
  }
}

async function getDirectoryData(directory) {
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

function findTreeElement(name) {
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

async function seedWithRoot() {
  const root = path.parse(process.cwd()).root;
  const { directories, files, fileNames } = await getDirectoryData(root);
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

async function loadCwd() {
  if (!this.cwd) {
    return;
  }

  this.txtPath.setValue(this.cwd);
  await txtPath_onSubmit.call(this);
}

function refreshTreeData() {
  // hack-fix; the mechanism where selected gets changed is flawed internally in blessed.List
  const selected = this.tvwDirectories.rows.selected;
  this.tvwDirectories.setData(this.tvwDirectories.data);
  this.tvwDirectories.rows.selected = selected;
  this.scnMain.render();
}

function defineScreenElements() {
  this.sdiRoot = blessed.box({
    screen: this.scnMain,
    parent: this.mainContainer,
    name: 'fileExplorer',
    border: 'line',
    height: '80%',
    left: 'center',
    top: 'center',
    hidden: true,
    keys: true,
    label: this.title,
    style: {
      border: {
        fg: 'white'
      }
    },
    tags: true,
    width: '50%'
  });

  this.txtPath = blessed.textbox({
    screen: this.scnMain,
    parent: this.sdiRoot,
    name: 'fileExplorer::path',
    border: 'line',
    top: 0,
    height: 3,
    width: '100%-2',
    keys: true,
    input: true,
    inputOnFocus: true,
    label: ' Path ',
    style: {
      border: {
        fg: 'white'
      },
      focus: {
        fg: 'white',
        bg: 'blue',
        border: {
          fg: 'blue'
        }
      }
    },
    tags: true
  });

  this.tvwDirectories = contrib.tree({
    screen: this.scnMain,
    parent: this.sdiRoot,
    name: 'fileExplorer::tree',
    template: {
      lines: true,
      extend: ' ',
      retract: ' '
    },
    tags: true,
    width: '35%',
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

  this.lstContents = blessed.list({
    screen: this.scnMain,
    parent: this.sdiRoot,
    name: 'fileExplorer::list',
    keys: true,
    interactive: true,
    invertSelected: true,
    scrollable: true,
    width: '65%-1',
    left: '35%',
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
    }
  });

  if (this.chooseFolderOnly) {
    this.btnChooseFolder = blessed.button({
      screen: this.scnMain,
      parent: this.sdiRoot,
      top: '100%-5',
      height: 3,
      left: '35%',
      width: '65%-1',
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
      border: 'line'
    });
  }
}

function setContentList({ path, fileNames = [] }) {
  this.loadedContentPath = path;

  this.lstContents.clearItems();
  this.lstContents.select(0);
  this.lstContents.resetScroll();
  this.lstContents.setItems(fileNames);
  this.scnMain.render();
}

function ensureElementVisible(index = this.tvwDirectories.rows.selected) {
  let scroll = index + this.tvwDirectories.rows.height - 1;
  if (scroll >= this.tvwDirectories.nodeLines.length) {
    scroll -= scroll - this.tvwDirectories.nodeLines.length + 1;
  }
  if (this.tvwDirectories.rows.getScroll() !== scroll) {
    this.tvwDirectories.rows.resetScroll();
    this.tvwDirectories.rows.scrollTo(scroll);

    loadAllVisibleElementMore.call(this);
  }
  this.scnMain.render();
}

async function ensureElementLoaded(element) {
  if (!element.loaded && element.isDirectory) {
    element.extended = true;
    element.loaded = true;

    refreshTreeData.call(this);
    ensureElementVisible.call(this);

    const { directories, files, fileNames } = await getDirectoryData(element.path);

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

    refreshTreeData.call(this);
    ensureElementVisible.call(this);
  }
}

function extendAllElementAncestors(element) {
  let pointer = element;
  while (pointer.parent) {
    pointer = pointer.parent;
    pointer.extended = true;
  }
}

function getElementIndex(element, root) {
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

function elementLoadMore(element) {
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

  refreshTreeData.call(this);
}

function loadAllVisibleElementMore() {
  const first = this.tvwDirectories.rows.selected;
  const last = _.clamp(
    this.tvwDirectories.rows.selected + this.tvwDirectories.rows.height,
    0,
    this.tvwDirectories.nodeLines.length - 1
  );

  for (let index = first; index <= last; index++) {
    const element = this.tvwDirectories.nodeLines[index];
    if (element.isMore) {
      elementLoadMore.call(this, element);
      ensureElementVisible.call(this, first);
    }
  }
}

function btnChooseFolder_onKey(name, ch, key) {
  switch (name) {
    case 'tab':
      this.txtPath.focus();
      break;
  }
}

function btnChooseFolder_onPress() {
  this.emit('accept', path.normalize(this.loadedContentPath));
}

function lstContents_onKey(name, ch, key) {
  switch (name) {
    case 'tab':
      if (this.chooseFolderOnly) {
        this.btnChooseFolder.focus();
      } else {
        this.txtPath.focus();
      }
      this.scnMain.render();
      break;
  }
}

function lstContents_onSelect(element, index) {
  const fileName = blessed.cleanTags(element.content);
  this.emit('accept', path.normalize(`${this.loadedContentPath}/${fileName}`));
}

function lstContents_onKeys(names, ch, key) {
  const scroll = (this.lstContents.height - 1) * (key.full === 'pageup' ? -1 : 1);

  this.lstContents.selected =
    _.clamp(this.lstContents.selected + scroll, 0, this.lstContents.getScrollHeight() - 1);

  this.lstContents.resetScroll();
  this.lstContents.scrollTo(this.lstContents.selected);
  this.scnMain.render();
}

function scnMain_onResize() {
  loadAllVisibleElementMore.call(this);
}

function sdiRoot_onHide() {
  this.scnMain.restoreFocus();
}

function sdiRoot_onShow() {
  this.sdiRoot.setFront();
  this.scnMain.saveFocus();
  this.tvwDirectories.focus();
  this.scnMain.render();
}

function tvwDirectories_onBlur() {
  this.tvwDirectories.style.border.fg = 'white';
  this.tvwDirectories.rows.style.selected.bg = 'white';
  this.tvwDirectories.rows.style.selected.fg = 'black';
}

function tvwDirectories_onFocus() {
  this.tvwDirectories.style.border.fg = 'blue';
  this.tvwDirectories.rows.style.selected.bg = 'blue';
  this.tvwDirectories.rows.style.selected.fg = 'white';
}

function tvwDirectories_onKey(name, ch, key) {
  switch (name) {
    case 'escape':
      this.sdiRoot.hide();
      this.scnMain.render();
      break;
    case 'tab':
      if (this.lstContents.items.length > 0) {
        this.lstContents.focus();
      } else if (this.chooseFolderOnly) {
        this.btnChooseFolder.focus();
      } else {
        this.txtPath.focus();
      }
      this.scnMain.render();
      break;
  }
}

async function tvwDirectories_onKeys(names, ch, key) {
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
          refreshTreeData.call(this);
          return;
        }

        const parent = element.parent || this.tvwDirectories.data;
        this.tvwDirectories.rows.selected = getElementIndex(parent, this.tvwDirectories.data);
        parent.extended = false;
        refreshTreeData.call(this);
        await tvwDirectories_onSelect.call(this, parent);
      }
      break;
    case 'right':
      {
        const element = this.tvwDirectories.nodeLines[this.tvwDirectories.rows.selected];
        element.extended = true;
        refreshTreeData.call(this);
        await tvwDirectories_onSelect.call(this, element);
      }
      break;
  }
}

function tvwDirectories_onScroll() {
  const element = this.tvwDirectories.nodeLines[this.tvwDirectories.rows.selected];
  if (element.isMore) {
    elementLoadMore.call(this, element);
  }
}

async function tvwDirectories_onSelect(element) {
  this.txtPath.setValue(element.path || element.name);
  ensureElementVisible.call(this);

  if (element.isDirectory && !element.loaded) {
    await ensureElementLoaded.call(this, element);
  }

  setContentList.call(this, element);
}

function txtPath_onKeypress(ch, key) {
  if (key.full === 'tab' || key.full === 'escape') {
    this.txtPath.cancel();
    this.tvwDirectories.focus();
    this.scnMain.render();
  } else if (key.full === 'enter') {
    this.txtPath.submit();
    this.tvwDirectories.focus();
    this.scnMain.render();
  }
}

async function txtPath_onSubmit() {
  this.txtPath.setValue(path.normalize(this.txtPath.getValue() || path.sep));
  const value = this.txtPath.getValue();

  try {
    await accessAsync(value);

    let [foundElement, closestElement] = findTreeElement.call(this, value);

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

        const index = getElementIndex(pointer, this.tvwDirectories.data);
        this.tvwDirectories.rows.selected = index;
        await ensureElementLoaded.call(this, pointer);

        closestElement = pointer;
        if (compareValue === comparePointerPath) {
          foundElement = pointer;
          done = true;
          return;
        }

        for (let childIndex = 0; childIndex < pointer.children.length; childIndex++) {
          if (pointer.children[childIndex].isMore) {
            elementLoadMore.call(this, pointer.children[childIndex]);
          }

          await loadAllMissing.call(this, pointer.children[childIndex]);

          if (done) {
            return;
          }
        }
      }

      extendAllElementAncestors(closestElement);
      await loadAllMissing.call(this, closestElement);
    }

    const positionElement = foundElement || closestElement;
    if (positionElement) {
      extendAllElementAncestors(positionElement);
      refreshTreeData.call(this);

      const index = getElementIndex(positionElement, this.tvwDirectories.data);
      this.tvwDirectories.rows.selected = index;
      tvwDirectories_onSelect.call(this, positionElement);
    }
  } catch (error) {

  }
}

function defineEventHandlers() {
  if (this.chooseFolderOnly) {
    this.btnChooseFolder.key('tab', btnChooseFolder_onKey.bind(this, 'tab'));
    this.btnChooseFolder.on('press', btnChooseFolder_onPress.bind(this));
  }

  if (!this.chooseFolderOnly) {
    this.lstContents.on('select', lstContents_onSelect.bind(this));
  }

  this.lstContents.key('tab', lstContents_onKey.bind(this, 'tab'));
  this.lstContents.key(['pageup', 'pagedown'], lstContents_onKeys.bind(this, ['pageup', 'pagedown']));

  this.scnMain.on('resize', scnMain_onResize.bind(this));

  this.sdiRoot.on('show', sdiRoot_onShow.bind(this));
  this.sdiRoot.on('hide', sdiRoot_onHide.bind(this));

  this.tvwDirectories.on('select', tvwDirectories_onSelect.bind(this));
  this.tvwDirectories.rows.on('blur', tvwDirectories_onBlur.bind(this));
  this.tvwDirectories.rows.on('focus', tvwDirectories_onFocus.bind(this));
  this.tvwDirectories.rows.on('scroll', tvwDirectories_onScroll.bind(this));
  this.tvwDirectories.rows.key('escape', tvwDirectories_onKey.bind(this, 'escape'));
  this.tvwDirectories.rows.key('tab', tvwDirectories_onKey.bind(this, 'tab'));
  this.tvwDirectories.rows.key(['pageup', 'pagedown'], tvwDirectories_onKeys.bind(this, ['pageup', 'pagedown']));
  this.tvwDirectories.rows.key(['left', 'right'], tvwDirectories_onKeys.bind(this, ['left', 'right']));

  this.txtPath.on('keypress', txtPath_onKeypress.bind(this));
  this.txtPath.on('submit', txtPath_onSubmit.bind(this));
}

async function construct() {
  defineScreenElements.call(this);
  defineEventHandlers.call(this);

  await seedWithRoot.call(this);
  await loadCwd.call(this);
}

module.exports = {
  FileExplorer
};
