/* eslint-disable import/no-extraneous-dependencies */
const filesystem = require('fs');
const os = require('os');
const path = require('path');
const sinon = require('sinon');
const memFs = require('mem-fs');
const slash = require('slash2');
const editor = require('..');

describe('#copy()', () => {
  let store;
  let fs;

  beforeEach(() => {
    store = memFs.create();
    fs = editor.create(store);
  });

  it('copy file', () => {
    const filepath = slash(path.join(__dirname, 'fixtures/file-a.txt'));
    const initialContents = fs.read(filepath);
    const newPath = '/new/path/file.txt';
    fs.copy(filepath, newPath);
    expect(fs.read(newPath)).toBe(initialContents);
    expect(fs.store.get(newPath).state).toBe('modified');
  });

  it('can copy directory not commited to disk', () => {
    const sourceDir = path.join(__dirname, '../test/foo');
    const destDir = path.join(__dirname, '../test/bar');
    fs.write(path.join(sourceDir, 'file-a.txt'), 'a');
    fs.write(path.join(sourceDir, 'file-b.txt'), 'b');

    fs.copy(path.join(sourceDir, '**'), destDir);

    expect(fs.read(path.join(destDir, 'file-a.txt'))).toBe('a');
    expect(fs.read(path.join(destDir, 'file-b.txt'))).toBe('b');
  });

  it('throws when trying to copy from a non-existing file', () => {
    const filepath = path.join(__dirname, 'fixtures/does-not-exits');
    const newPath = path.join(__dirname, '../test/new/path/file.txt');
    expect(fs.copy.bind(fs, filepath, newPath)).toThrow();
  });

  it('copy file and process contents', () => {
    const filepath = path.join(__dirname, 'fixtures/file-a.txt');
    const initialContents = fs.read(filepath);
    const contents = 'some processed contents';
    const newPath = path.join(__dirname, '../test/new/path/file.txt');
    fs.copy(filepath, newPath, {
      process(contentsArg) {
        expect(contentsArg).toBeInstanceOf(Buffer);
        expect(contentsArg.toString()).toEqual(initialContents);
        return contents;
      },
    });
    expect(fs.read(newPath)).toBe(contents);
  });

  it('copy by directory', () => {
    const outputDir = slash(path.join(__dirname, '../test/output'));
    fs.copy(path.join(__dirname, '/fixtures'), outputDir);
    expect(fs.read(path.join(outputDir, 'file-a.txt'))).toBe(`foo\n`);
    expect(fs.read(path.join(outputDir, '/nested/file.txt'))).toBe(`nested\n`);
  });

  it('copy by globbing', () => {
    const outputDir = slash(path.join(__dirname, '../test/output'));
    fs.copy(path.join(__dirname, '/fixtures/**'), outputDir);
    expect(fs.read(path.join(outputDir, 'file-a.txt'))).toBe(`foo\n`);
    expect(fs.read(path.join(outputDir, '/nested/file.txt'))).toBe(`nested\n`);
  });

  it('copy by globbing multiple patterns', () => {
    const outputDir = slash(path.join(__dirname, '../test/output'));
    fs.copy([path.join(__dirname, '/fixtures/**'), '!**/*tpl*'], outputDir);
    expect(fs.read(path.join(outputDir, 'file-a.txt'))).toBe(`foo\n`);
    expect(fs.read(path.join(outputDir, '/nested/file.txt'))).toBe(`nested\n`);
    expect(fs.read.bind(fs, path.join(outputDir, 'file-tpl.txt'))).toThrow();
  });

  it('copy files by globbing and process contents', () => {
    const outputDir = slash(path.join(__dirname, '../test/output'));
    const process = sinon.stub().returnsArg(0);
    fs.copy(path.join(__dirname, '/fixtures/**'), outputDir, { process });
    sinon.assert.callCount(process, 8); // 7 total files under 'fixtures', not counting folders
    expect(fs.read(path.join(outputDir, 'file-a.txt'))).toBe(`foo\n`);
    expect(fs.read(path.join(outputDir, '/nested/file.txt'))).toBe(`nested\n`);
  });

  it('accepts directory name with "."', () => {
    const outputDir = slash(path.join(__dirname, '../test/out.put'));
    fs.copy(path.join(__dirname, '/fixtures/**'), outputDir);
    expect(fs.read(path.join(outputDir, 'file-a.txt'))).toBe(`foo\n`);
    expect(fs.read(path.join(outputDir, '/nested/file.txt'))).toBe(`nested\n`);
  });

  it('accepts template paths', () => {
    const outputFile = slash(path.join(__dirname, 'test/<%= category %>/file-a.txt'));
    fs.copy(path.join(__dirname, '/fixtures/file-a.txt'), outputFile, {}, { category: 'foo' });
    expect(fs.read(path.join(__dirname, 'test/foo/file-a.txt'))).toBe(`foo\n`);
  });

  it('requires destination directory when globbing', () => {
    expect(
      fs.copy.bind(
        fs,
        path.join(__dirname, '/fixtures/**'),
        path.join(__dirname, '/fixtures/file-a.txt'),
      ),
    ).toThrow();
  });

  it('preserve permissions', (done) => {
    const filename = slash(path.join(os.tmpdir(), 'perm.txt'));
    const copyname = slash(path.join(os.tmpdir(), 'copy-perm.txt'));
    filesystem.writeFileSync(filename, 'foo', { mode: parseInt(733, 8) });

    fs.copy(filename, copyname);

    fs.commit(() => {
      const oldStat = filesystem.statSync(filename);
      const newStat = filesystem.statSync(copyname);
      expect(newStat.mode).toBe(oldStat.mode);
      done();
    });
  });
});
