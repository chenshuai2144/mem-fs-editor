/* eslint-disable import/no-extraneous-dependencies */
const os = require('os');
const memFs = require('mem-fs');
const util = require('../lib/util');
const editor = require('..');

describe('#write()', () => {
  let store;
  let fs;

  beforeEach(() => {
    store = memFs.create();
    fs = editor.create(store);
  });

  it('appends new content to file', () => {
    fs.write('append.txt', 'a\n\n\n');
    fs.append('append.txt', 'b');
    expect(util.winEol(fs.read('append.txt'))).toBe(`a\nb`);
  });

  it('allows specifying custom separator', () => {
    fs.write('append.txt', 'a');
    fs.append('append.txt', 'b', { separator: ', ' });

    expect(fs.read('append.txt')).toBe('a, b');
  });

  it('allows disabling end trim', () => {
    fs.write('append.txt', 'a\n\n');
    fs.append('append.txt', 'b', { trimEnd: false });

    expect(fs.read('append.txt')).toBe(`a\n\n${os.EOL}b`);
  });
});
