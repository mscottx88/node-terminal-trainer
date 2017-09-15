const blessed = require('blessed');
const contrib = require('blessed-contrib');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const util = require('util');

const DirectoryTree = require('../widgets/directory-tree').DirectoryTree;
const TabView = require('./tab-view').TabView;

const accessAsync = util.promisify(fs.access);

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

  async loadCwd() {
    if (!this.cwd) {
      return;
    }

    this.txtPath.setValue(this.cwd);
    await this.txtPath_onSubmit();
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

    this.addScreenElement({
      definition: {
        tabIndex: 0,
        top: 3,
        width: '30%-1'
      },
      name: 'tvwDirectories',
      type: 'DirectoryTree'
    });

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
            this.tvwDirectories.refreshTreeData();
            return;
          }

          const parent = element.parent || this.tvwDirectories.data;
          this.tvwDirectories.rows.selected = DirectoryTree.getElementIndex(parent, this.tvwDirectories.data);
          parent.extended = false;
          this.tvwDirectories.refreshTreeData();
          await this.tvwDirectories_onSelect(parent);
        }
        break;
      case 'right':
        {
          const element = this.tvwDirectories.nodeLines[this.tvwDirectories.rows.selected];
          element.extended = true;
          this.tvwDirectories.refreshTreeData();
          await this.tvwDirectories_onSelect(element);
        }
        break;
    }
  }

  // move to overload
  tvwDirectories_onScroll() {
    const element = this.tvwDirectories.nodeLines[this.tvwDirectories.rows.selected];
    if (element && element.isMore) {
      this.tvwDirectories.elementLoadMore(element);
    }
  }

  async tvwDirectories_onSelect(element) {
    this.txtPath.setValue(element.path || element.name);
    this.tvwDirectories.ensureElementVisible();

    if (element.isDirectory && !element.loaded) {
      await this.tvwDirectories.ensureElementLoaded(element);
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

      let [foundElement, closestElement] = this.tvwDirectories.findTreeElement(value);

      if (!foundElement && closestElement) {
        let done;
        async function loadAllMissing(pointer) {
          if (done) {
            return;
          }

          const compareValue = process.platform === 'win32' ? value.toLowerCase() : value;
          const comparePointerPath = (process.platform === 'win32' && pointer.path) ? pointer.path.toLowerCase() : pointer.path || '';

          if (compareValue.indexOf(comparePointerPath) !== 0) {
            return;
          }

          const index = DirectoryTree.getElementIndex(pointer, this.tvwDirectories.data);
          this.tvwDirectories.rows.selected = index;
          await this.tvwDirectories.ensureElementLoaded(pointer);

          closestElement = pointer;
          if (compareValue === comparePointerPath) {
            foundElement = pointer;
            done = true;
            return;
          }

          for (let childIndex = 0; childIndex < pointer.children.length; childIndex++) {
            if (pointer.children[childIndex].isMore) {
              this.tvwDirectories.elementLoadMore(pointer.children[childIndex]);
            }

            await loadAllMissing.call(this, pointer.children[childIndex]);

            if (done) {
              return;
            }
          }
        }

        DirectoryTree.extendAllElementAncestors(closestElement);
        await loadAllMissing.call(this, closestElement);
      }

      const positionElement = foundElement || closestElement;
      if (positionElement) {
        DirectoryTree.extendAllElementAncestors(positionElement);
        this.tvwDirectories.refreshTreeData();

        const index = DirectoryTree.getElementIndex(positionElement, this.tvwDirectories.data);
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

    await this.tvwDirectories.seedWithRoot();
    await this.loadCwd();
  }
}

module.exports = {
  FileExplorer
};
