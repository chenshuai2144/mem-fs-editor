/* eslint-disable import/no-extraneous-dependencies */
const filesystem = require('fs');
const os = require('os');
const path = require('path');
const sinon = require('sinon');
const memFs = require('mem-fs');
const slash = require('slash2');
const editor = require('..');

describe('#copyAsync()', () => {
  let store;
  let fs;

  beforeEach(() => {
    store = memFs.create();
    fs = editor.create(store);
  });

  it('copy file', async () => {
    const filepath = slash(path.join(__dirname, 'fixtures/file-a.txt'));
    const initialContents = fs.read(filepath);
    const newPath = '/new/path/file.txt';
    await fs.copyAsync(filepath, newPath);
    expect(fs.read(newPath)).toBe(initialContents);
    expect(fs.store.get(newPath).state).toBe('modified');
  });

  it('can copy directory not commited to disk', async () => {
    const sourceDir = path.join(__dirname, '../test/foo');
    const destDir = path.join(__dirname, '../test/bar');
    fs.write(path.join(sourceDir, 'file-a.txt'), 'a');
    fs.write(path.join(sourceDir, 'file-b.txt'), 'b');

    await fs.copyAsync(path.join(sourceDir, '**'), destDir);

    expect(fs.read(path.join(destDir, 'file-a.txt'))).toBe('a');
    expect(fs.read(path.join(destDir, 'file-b.txt'))).toBe('b');
  });

  it('throws when trying to copy from a non-existing file', async () => {
    const filepath = path.join(__dirname, 'fixtures/does-not-exits');
    const newPath = path.join(__dirname, '../test/new/path/file.txt');
    try {
      await fs.copyAsync.bind(fs, filepath, newPath);
    } catch (error) {
      expect(error).toThrow();
    }
  });

  it('copy file and process contents', async () => {
    const filepath = path.join(__dirname, 'fixtures/file-a.txt');
    const initialContents = fs.read(filepath);
    const contents = 'some processed contents';
    const newPath = path.join(__dirname, '../test/new/path/file.txt');
    await fs.copyAsync(filepath, newPath, {
      process: async (contentsArg) => {
        expect(contentsArg).toBeInstanceOf(Buffer);
        expect(contentsArg.toString()).toEqual(initialContents);
        return contents;
      },
    });
    expect(fs.read(newPath)).toBe(contents);
  });

  it('copy by directory', async () => {
    const outputDir = slash(path.join(__dirname, '../test/output'));
    await fs.copyAsync(path.join(__dirname, '/fixtures'), outputDir);
    expect(fs.read(path.join(outputDir, 'file-a.txt'))).toBe(`foo\n`);
    expect(fs.read(path.join(outputDir, '/nested/file.txt'))).toBe(`nested\n`);
  });

  it('copy by globbing', async () => {
    const outputDir = slash(path.join(__dirname, '../test/output'));
    await fs.copyAsync(path.join(__dirname, '/fixtures/**'), outputDir);
    expect(fs.read(path.join(outputDir, 'file-a.txt'))).toBe(`foo\n`);
    expect(fs.read(path.join(outputDir, '/nested/file.txt'))).toBe(`nested\n`);
  });

  it('copy by globbing multiple patterns', async () => {
    const outputDir = slash(path.join(__dirname, '../test/output'));
    await fs.copyAsync([path.join(__dirname, '/fixtures/**'), '!**/*tpl*'], outputDir);
    expect(fs.read(path.join(outputDir, 'file-a.txt'))).toBe(`foo\n`);
    expect(fs.read(path.join(outputDir, '/nested/file.txt'))).toBe(`nested\n`);
    expect(fs.read.bind(fs, path.join(outputDir, 'file-tpl.txt'))).toThrow();
  });

  it('copy files by globbing and process contents', async () => {
    const outputDir = slash(path.join(__dirname, '../test/output'));
    const process = sinon.stub().returnsArg(0);
    await fs.copyAsync(path.join(__dirname, '/fixtures/**'), outputDir, {
      process: async (params) => process(params),
    });
    sinon.assert.callCount(process, 8); // 7 total files under 'fixtures', not counting folders
    expect(fs.read(path.join(outputDir, 'file-a.txt'))).toBe(`foo\n`);
    expect(fs.read(path.join(outputDir, '/nested/file.txt'))).toBe(`nested\n`);
  });

  it('accepts directory name with "."', async () => {
    const outputDir = slash(path.join(__dirname, '../test/out.put'));
    await fs.copyAsync(path.join(__dirname, '/fixtures/**'), outputDir);
    expect(fs.read(path.join(outputDir, 'file-a.txt'))).toBe(`foo\n`);
    expect(fs.read(path.join(outputDir, '/nested/file.txt'))).toBe(`nested\n`);
  });

  it('accepts template paths', async () => {
    const outputFile = slash(path.join(__dirname, 'test/<%= category %>/file-a.txt'));
    await fs.copyAsync(
      path.join(__dirname, '/fixtures/file-a.txt'),
      outputFile,
      {},
      { category: 'foo' },
    );
    expect(fs.read(path.join(__dirname, 'test/foo/file-a.txt'))).toBe(`foo\n`);
  });

  it('requires destination directory when globbing', async () => {
    try {
      await fs.copyAsync.bind(
        fs,
        path.join(__dirname, '/fixtures/**'),
        path.join(__dirname, '/fixtures/file-a.txt'),
      );
    } catch (error) {
      expect(error).toThrow();
    }
  });

  it('preserve permissions', async (done) => {
    const filename = slash(path.join(os.tmpdir(), 'perm.txt'));
    const copyname = slash(path.join(os.tmpdir(), 'copy-perm.txt'));
    filesystem.writeFileSync(filename, 'foo', { mode: parseInt(733, 8) });

    await fs.copyAsync(filename, copyname);

    fs.commit(async () => {
      const oldStat = filesystem.statSync(filename);
      const newStat = filesystem.statSync(copyname);
      expect(newStat.mode).toBe(oldStat.mode);
      done();
    });
  });
});
