/* eslint-disable import/no-extraneous-dependencies */
const filesystem = require('fs');
const path = require('path');
const sinon = require('sinon');
const slash = require('slash2');
const util = require('../lib/util');

describe('util.getCommonPath()', () => {
  it('find the common root of /a/b/c, where /a/b/c is an existing directory', () => {
    const filePath = path.resolve(__dirname, 'fixtures');
    expect(util.getCommonPath(filePath)).toBe(filePath);
  });

  it('find the common root of /a/b/c, where /a/b/c is an existing file', () => {
    const filePath = path.resolve(__dirname, 'fixtures');
    expect(util.getCommonPath(path.join(filePath, 'file-a.txt'))).toBe(filePath);
  });

  it('find the common root of /a/b/c, where /a/b/c is a non-existing file', () => {
    const filePath = path.resolve(__dirname, 'fixtures');
    expect(util.getCommonPath(path.join(filePath, 'does-not-exists.txt'))).toBe(filePath);
  });

  it('find the common root of glob /a/b/**', () => {
    expect(util.getCommonPath('/a/b/**')).toBe('/a/b');
  });

  it('find the common root of glob /a/b*/c', () => {
    expect(util.getCommonPath('/a/b*/c')).toBe('/a');
  });

  it('find the common root of glob /a/b/*.ext', () => {
    expect(util.getCommonPath('/a/b/*.ext')).toBe('/a/b');
  });

  it('find the common root of multiple globs', () => {
    expect(util.getCommonPath(['/a/b/*.ext', '/a/b/c/*.ext', '!**/c/**'])).toBe('/a/b');
  });
});

describe('util.globify()', () => {
  it('returns path for file path', () => {
    const filePath = slash(path.resolve(__dirname, 'fixtures/file-a.txt'));
    expect(util.globify(filePath)).toBe(filePath);
  });

  it('returns pattern matching both files and directory for nonexisting paths', () => {
    const filePath = '/nonexisting.file';
    expect(util.globify(filePath)).toEqual([slash(filePath), slash(path.join(filePath, '**'))]);
  });

  it('returns glob for glob path', () => {
    const filePath = slash(path.resolve(__dirname, 'fixtures/*.txt'));
    expect(util.globify(filePath)).toBe(filePath);

    const filePath2 = slash(path.resolve(__dirname, 'fixtures/file-{a,b}.txt'));
    expect(util.globify(filePath2)).toBe(filePath2);
  });

  it('returns globified path for directory path', () => {
    const filePath = slash(path.resolve(__dirname, 'fixtures/nested'));
    expect(util.globify(filePath)).toBe(slash(path.join(filePath, '**')));
  });

  it('throws if target path is neither a file or a directory', () => {
    sinon.stub(filesystem, 'statSync').returns({
      isFile: () => false,
      isDirectory: () => false,
    });

    const filePath = slash(path.resolve(__dirname, 'fixtures/file-a.txt'));
    expect(util.globify.bind(util, filePath)).toThrow();

    filesystem.statSync.restore();
  });
});
