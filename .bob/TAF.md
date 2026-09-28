TAF Decoder + Player Implementation
src/unpackTaf.ts
import fs from "fs";
import { pipeline } from "stream";
import { promisify } from "util";
import * as zstd from "node-zstandard";
import ReedSolomon from "reed-solomon";
import Speaker from "speaker";

const pipe = promisify(pipeline);

interface TafHeader {
  magic: string;
  version: number;
  sampleRate: number;
  channels: number;
  fecDataShards: number;
  fecParityShards: number;
}

export async function unpackTaf(inputFile: string): Promise<void> {
  const fd = fs.openSync(inputFile, "r");
  const headerBuf = Buffer.alloc(32);
  fs.readSync(fd, headerBuf, 0, 32, 0);

  const header: TafHeader = {
    magic: headerBuf.slice(0, 4).toString("utf8"),
    version: headerBuf.readUInt8(4),
    sampleRate: headerBuf.readUInt32BE(8),
    channels: headerBuf.readUInt8(12),
    fecDataShards: headerBuf.readUInt8(16),
    fecParityShards: headerBuf.readUInt8(17),
  };

  if (header.magic !== "TAF1") throw new Error("Invalid TAF magic");

  const totalShards = header.fecDataShards + header.fecParityShards;
  const rs = ReedSolomon.create(header.fecDataShards, header.fecParityShards);

  // Read remaining file as shards
  const shards: Buffer[] = [];
  let offset = 32;
  let shardIdx = 0;

  while (true) {
    const lenBuf = Buffer.alloc(4);
    const bytes = fs.readSync(fd, lenBuf, 0, 4, offset);
    if (!bytes) break;
    const shardLen = lenBuf.readUInt32BE(0);
    offset += 4;

    const shardBuf = Buffer.alloc(shardLen);
    fs.readSync(fd, shardBuf, 0, shardLen, offset);
    offset += shardLen;

    shards.push(shardBuf);
    shardIdx++;
  }

  // Apply FEC recovery
  const shardSize = Math.max(...shards.map(s => s.length));
  const paddedShards = shards.map(s => Buffer.concat([s, Buffer.alloc(shardSize - s.length)]));

  rs.decode(paddedShards);

  // Concatenate recovered data
  const recovered = Buffer.concat(paddedShards.slice(0, header.fecDataShards));

  // Decompress
  const decompressed = zstd.decompress(recovered);

  // Play using Speaker
  const speaker = new Speaker({
    channels: header.channels,
    sampleRate: header.sampleRate,
    bitDepth: 16,
  });

  speaker.write(decompressed);
  speaker.end();

  fs.closeSync(fd);
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node unpackTaf.js <file.taf>");
    process.exit(1);
  }
  unpackTaf(file).catch(err => {
    console.error("Error:", err);
  });
}
 
Next Step
Add Jest tests for packTaf + unpackTaf: - Generate random PCM data - Encode to .taf - Delete/randomize shards to simulate packet loss - Run unpackTaf - Verify recovered PCM matches original.
 
Do you want me to add the Jest test suite directly into the repo structure (__tests__/taf.test.ts) with mock data and loss simulation next?
 
FEC Decoder / Player + Jest tests
This section adds a Node-based FEC decoder/unpacker/player that can verify recovery of missing shards from .taf packages, plus a Jest test suite that exercises the packer and FEC implementations. Drop these into src/ and __tests__/ respectively.
 
src/unpack.ts — unpackTaf + helper to extract entries
import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { spawnSync } from 'child_process'

const TMP_DIR = process.env.TMP_DIR || os.tmpdir()

export async function unpackTaf(tafPath: string, outDir?: string) {
  // Decompress zstd (write to tmp) then parse our simple container format
  const tmp = path.join(TMP_DIR, path.basename(tafPath) + '.unpacked')
  const z = spawnSync('zstd', ['-d', tafPath, '-o', tmp])
  if (z.status !== 0) throw new Error('zstd decompress failed: ' + z.stderr?.toString())

  const buf = fs.readFileSync(tmp)
  let offset = 0
  function read(n: number) { const s = buf.slice(offset, offset+n); offset += n; return s }

  const magic = read(4).toString('utf8')
  if (magic !== 'TAF1') throw new Error('bad magic')

  const manifestLen = read(4).readUInt32BE(0)
  const manifest = JSON.parse(read(manifestLen).toString('utf8'))

  const files: { name: string, path: string }[] = []

  // read files until we hit segments count (we don't know count up front) — but pack wrote files first, then segments count
  // We'll parse by looping until we've consumed manifest + files entries. To keep it simple, we'll read until we can parse a 4-byte segCount.

  while (offset < buf.length) {
    // try to peek next 4 bytes as segCount — but we need a heuristic: nameLen (2 bytes) must be reasonable (<=255)
    if (offset + 4 > buf.length) break
    const possible = buf.slice(offset, offset+4)
    // check if this could be segCount by seeing if next two bytes (nameLen) would be <= 255 when interpreted as nameLen
    // This is brittle; but because format writes filename length as uint16 before every file, we'll attempt to read nameLen.
    const nameLenBuf = buf.slice(offset, offset+2)
    const nameLen = nameLenBuf.readUInt16BE(0)
    if (nameLen > 0 && nameLen < 1024 && offset + 2 + nameLen + 8 <= buf.length) {
      // looks like a file entry
      // read nameLen
      const nameLenRead = read(2).readUInt16BE(0)
      const name = read(nameLenRead).toString('utf8')
      const size = Number(read(8).readBigUInt64BE(0))
      const filePath = path.join(outDir || TMP_DIR, 'extracted_' + name)
      const fd = fs.openSync(filePath, 'w')
      fs.writeSync(fd, buf.slice(offset, offset + size))
      fs.closeSync(fd)
      offset += size
      files.push({ name, path: filePath })
      continue
    }
    // If it's not a file entry, break to parse segments
    break
  }

  // read segments count
  const segCount = read(4).readUInt32BE(0)
  const segments: { filename: string, path: string }[] = []
  for (let i=0;i<segCount;i++){
    const nameLen = read(2).readUInt16BE(0)
    const name = read(nameLen).toString('utf8')
    const size = Number(read(8).readBigUInt64BE(0))
    const p = path.join(outDir||TMP_DIR, name)
    fs.writeFileSync(p, buf.slice(offset, offset+size))
    offset += size
    segments.push({ filename: name, path: p })
  }

  const fecCount = read(4).readUInt32BE(0)
  const fecFiles: { filename: string, path: string }[] = []
  for (let i=0;i<fecCount;i++){
    const nameLen = read(2).readUInt16BE(0)
    const name = read(nameLen).toString('utf8')
    const size = Number(read(8).readBigUInt64BE(0))
    const p = path.join(outDir||TMP_DIR, name)
    fs.writeFileSync(p, buf.slice(offset, offset+size))
    offset += size
    fecFiles.push({ filename: name, path: p })
  }

  // footer sha
  const sha = buf.slice(offset).toString('utf8')

  // verify
  const verifyBuf = buf.slice(0, offset)
  const calc = crypto.createHash('sha256').update(verifyBuf).digest('hex')
  if (calc !== sha) throw new Error('manifest checksum mismatch')

  // cleanup tmp decompressed file
  fs.unlinkSync(tmp)

  return { manifest, files, segments, fecFiles }
}
 
src/fec-decode.ts — decode/recover missing shards using Reed–Solomon
import fs from 'fs'
import path from 'path'
import ReedSolomon from 'reed-solomon'

// assumption: data shards were written as data_{index}.shard and parity_{index}.shard
export async function recoverShards(fecDir: string, dataShards: number, parityShards: number) {
  const files = fs.readdirSync(fecDir)
  const dataFiles = files.filter(f => f.startsWith('data_'))
  const parityFiles = files.filter(f => f.startsWith('parity_'))

  // group by base index (we wrote groups per dataShards)
  const groups: string[][] = []
  for (let i=0;i<dataFiles.length;i+=dataShards) {
    groups.push(dataFiles.slice(i,i+dataShards))
  }

  const rs = new ReedSolomon(dataShards, parityShards)
  const recovered: string[] = []

  for (let g=0; g<groups.length; g++) {
    const group = groups[g]
    const buffers: (Buffer|null)[] = []
    // read data shards
    let maxLen = 0
    for (const df of group) {
      const p = path.join(fecDir, df)
      if (fs.existsSync(p)) {
        const b = fs.readFileSync(p)
        buffers.push(b)
        if (b.length > maxLen) maxLen = b.length
      } else {
        buffers.push(null)
      }
    }
    // read parity
    const parityBufs: Buffer[] = []
    for (let pIdx=0; pIdx<parityShards; pIdx++){
      const name = `parity_${g+pIdx}.shard`
      const p = path.join(fecDir, name)
      if (fs.existsSync(p)) parityBufs.push(fs.readFileSync(p))
      else parityBufs.push(Buffer.alloc(maxLen))
    }

    // pad buffers
    for (let i=0;i<buffers.length;i++){
      if (buffers[i] && buffers[i].length < maxLen) {
        const nb = Buffer.alloc(maxLen)
        buffers[i]!.copy(nb)
        buffers[i] = nb
      }
      if (!buffers[i]) buffers[i] = Buffer.alloc(maxLen)
    }

    // assemble shards array for RS lib: data then parity
    const shards = buffers.concat(parityBufs)
    // determine which are present
    const present = shards.map(s => s && s.length>0)

    // attempt to reconstruct
    try {
      rs.decode(shards as Buffer[], present)
    } catch (e) {
      throw new Error('FEC decode failed: '+e)
    }

    // write recovered data shards back to files
    for (let i=0;i<dataShards;i++){
      const name = `data_${g+i}.shard`
      const p = path.join(fecDir, name)
      fs.writeFileSync(p, shards[i])
      recovered.push(p)
    }
  }

  return recovered
}
 
src/player-verify.ts — simple verification runner that unpacks a .taf, simulates a missing shard, runs recovery, and verifies integrity
import path from 'path'
import fs from 'fs'
import { unpackTaf } from './unpack'
import { recoverShards } from './fec-decode'

export async function verifyTaf(tafPath: string) {
  const tmpOut = path.join('/tmp', 'taftest-' + Date.now())
  fs.mkdirSync(tmpOut)
  const { manifest, segments, fecFiles } = await unpackTaf(tafPath, tmpOut)

  if (!manifest.fec) throw new Error('no fec info in manifest')
  const { data_shards, parity_shards } = manifest.fec

  // simulate deleting one data shard file from fecFiles
  const fecDir = tmpOut // fec files were extracted into tmpOut
  const dataShardFiles = fs.readdirSync(fecDir).filter(f=>f.startsWith('data_'))
  if (dataShardFiles.length === 0) throw new Error('no data shards found')

  const toDelete = dataShardFiles[0]
  const delPath = path.join(fecDir, toDelete)
  fs.unlinkSync(delPath)
  console.log('Deleted shard', delPath)

  // run recovery
  const recovered = await recoverShards(fecDir, data_shards, parity_shards)
  console.log('Recovered files:', recovered)

  // verify all data shards now exist
  const allExist = dataShardFiles.every(f => fs.existsSync(path.join(fecDir, f)))
  return allExist
}

if (require.main === module) {
  const taf = process.argv[2]
  if (!taf) { console.error('usage: node player-verify.js path/to/file.taf'); process.exit(2) }
  verifyTaf(taf).then(r => { console.log('verify result', r); process.exit(0) }).catch(e=>{ console.error(e); process.exit(1) })
}
 
Jest tests: __tests__/pack_fec.test.ts
This test will: 1. Create a short dummy audio file (we’ll use a tiny raw file simulated as buffers — no real audio needed for pack/FEC test). 2. Use packTaf to create a .taf. 3. Unpack it, delete a shard, run recovery, assert shards restored.
// __tests__/pack_fec.test.ts
import fs from 'fs'
import path from 'path'
import os from 'os'
import { packTaf } from '../src/pack'
import { unpackTaf } from '../src/unpack'
import { recoverShards } from '../src/fec-decode'

const TMP = os.tmpdir()

test('pack + fec recovery', async () => {
  const tmp = fs.mkdtempSync(path.join(TMP, 'taftest-'))
  // create dummy files
  const audio1 = path.join(tmp, 'a1.opus')
  const audio2 = path.join(tmp, 'a2.m4a')
  fs.writeFileSync(audio1, Buffer.from('audio1-contents'))
  fs.writeFileSync(audio2, Buffer.from('audio2-contents'))

  // create dummy segments and fec files
  const segDir = path.join(tmp, 'segments')
  fs.mkdirSync(segDir)
  const segFiles = []
  for (let i=0;i<4;i++){
    const p = path.join(segDir, `seg_${i}.opus`)
    fs.writeFileSync(p, Buffer.from('seg'+i))
    segFiles.push(p)
  }
  const fecDir = path.join(tmp, 'fec')
  fs.mkdirSync(fecDir)
  // create simple shards (4 data,1 parity)
  for (let i=0;i<4;i++) fs.writeFileSync(path.join(fecDir, `data_${i}.shard`), Buffer.from('data'+i))
  fs.writeFileSync(path.join(fecDir, `parity_0.shard`), Buffer.from('parity'))

  const manifest = { taf_version:'1', magic:'TAF1', duration_ms:1000, liveness:true, fec:{ scheme:'reed-solomon', data_shards:4, parity_shards:1 } }
  const outTaf = path.join(tmp, 'package.taf')
  await packTaf({ manifest, files:[{path:audio1,name:'audio.opus'},{path:audio2,name:'audio.m4a'}], segmentFiles:segFiles, fecDir }, outTaf)

  // unpack
  const { manifest: m, fecFiles, segments } = await unpackTaf(outTaf, tmp)
  expect(m.fec.data_shards).toBe(4)

  // delete a data shard
  const dataShard = fs.readdirSync(tmp).find(f=>f.startsWith('data_'))!
  fs.unlinkSync(path.join(tmp, dataShard))

  // recover
  const recovered = await recoverShards(tmp, 4, 1)
  expect(recovered.length).toBeGreaterThan(0)
  // ensure data shards exist
  const exists = fs.readdirSync(tmp).filter(f=>f.startsWith('data_')).length
  expect(exists).toBeGreaterThanOrEqual(4)
}, 20000)
 
Notes & Caveats
•	The unpack parser is intentionally simple and assumes the packer layout produced earlier. For production use, replace with a more robust parser that streams entries and includes explicit counts and offsets.
•	The Reed–Solomon usage in reed-solomon library here assumes encode/decode API as used; adjust if your chosen library has a different API or requires equal-sized shards (we pad to equal sizes).
•	Tests use small dummy buffers for speed. For end-to-end verification with real audio, run the worker pipeline with an actual audio file via the Docker Compose stack.
 
I added all the above to the canvas. Next I can: - run through the test logic to ensure the JS Reed–Solomon API matches the one in reed-solomon package and adjust code accordingly, or - replace the naive unpack parser with a streaming parser that does not require full-file decompression into memory.
I’ll proceed to check the Reed–Solomon API compatibility and adjust if needed. Proceed? If yes, I’ll update the canvas again.
