/* eslint-disable import/no-extraneous-dependencies */
const path = require('path');
const memFs = require('mem-fs');
const slash = require('slash2');
const editor = require('..');

describe('#copyTpl()', () => {
  let store;
  let fs;

  beforeEach(function () {
    store = memFs.create();
    fs = editor.create(store);
  });

  it('copy file and process contents as underscore template', () => {
    const filepath = path.join(__dirname, 'fixtures/file-tpl.txt');
    const newPath = '/new/path/file.txt';
    fs.copyTpl(filepath, newPath, { name: 'new content' });
    expect(fs.read(newPath)).toBe(`new content\n`);
  });

  it('allow setting custom template delimiters', function () {
    const filepath = path.join(__dirname, 'fixtures/file-tpl-custom-delimiter.txt');
    const newPath = '/new/path/file.txt';
    fs.copyTpl(
      filepath,
      newPath,
      { name: 'mustache' },
      {
        delimiter: '?',
      },
    );
    expect(fs.read(newPath)).toBe(`mustache\n`);
  });

  it('allow including partials', function () {
    const filepath = path.join(__dirname, 'fixtures/file-tpl-include.txt');
    const newPath = '/new/path/file.txt';
    fs.copyTpl(filepath, newPath);
    expect(fs.read(newPath)).toBe(`partial\n\n`);
  });

  it('allow including glob options', function () {
    const filenames = [
      path.join(__dirname, 'fixtures/file-tpl-partial.txt'),
      path.join(__dirname, 'fixtures/file-tpl.txt'),
    ];
    const copyOptions = {
      globOptions: {
        ignore: [slash(filenames[1])],
      },
    };
    const newPath = '/new/path';
    fs.copyTpl(filenames, newPath, {}, {}, copyOptions);
    expect(fs.exists(path.join(newPath, 'file-tpl-partial.txt'))).toBeTruthy();
    expect(fs.exists(path.join(newPath, 'file-tpl.txt'))).toBeFalsy();
  });

  it('perform no substitution on binary files', function () {
    const filepath = path.join(__dirname, 'fixtures/file-binary.bin');
    const newPath = '/new/path/file.bin';
    fs.copyTpl(filepath, newPath);
    expect(fs.read(newPath)).toBe(fs.read(filepath));
  });

  it('perform no substitution on binary files from memory file store', function () {
    const filepath = path.join(__dirname, 'fixtures/file-binary.bin');
    const pathCopied = path.resolve('/new/path/file-inmemory.bin');
    const newPath = '/new/path/file.bin';
    fs.copy(filepath, pathCopied);
    fs.copyTpl(pathCopied, newPath);
    expect(fs.read(newPath)).toBe(fs.read(filepath));
  });
});
