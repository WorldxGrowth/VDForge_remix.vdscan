let compiler = null;
let currentVersion = null;

const BUILDS = {
  '0.8.35': 'soljson-v0.8.35+commit.47b9dedd.js',
  '0.8.34': 'soljson-v0.8.34+commit.80d5c536.js',
  '0.8.33': 'soljson-v0.8.33+commit.64118f21.js',
  '0.8.32': 'soljson-v0.8.32+commit.ebbd65e5.js',
  '0.8.31': 'soljson-v0.8.31+commit.fd3a2265.js',
  '0.8.30': 'soljson-v0.8.30+commit.73712a01.js',
  '0.8.28': 'soljson-v0.8.28+commit.7893614a.js',
  '0.8.26': 'soljson-v0.8.26+commit.8a97fa7a.js',
  '0.8.25': 'soljson-v0.8.25+commit.b61c2a91.js',
  '0.8.24': 'soljson-v0.8.24+commit.e11b9ed9.js',
  '0.8.23': 'soljson-v0.8.23+commit.f704f362.js',
  '0.8.21': 'soljson-v0.8.21+commit.d9974bed.js',
  '0.8.20': 'soljson-v0.8.20+commit.a1b79de6.js',
  '0.8.19': 'soljson-v0.8.19+commit.7dd6d404.js',
  '0.8.17': 'soljson-v0.8.17+commit.8df45f5f.js',
  '0.8.10': 'soljson-v0.8.10+commit.fc410830.js',
  '0.8.0':  'soljson-v0.8.0+commit.c7dfd78e.js',
  '0.7.6':  'soljson-v0.7.6+commit.7338295f.js',
  '0.6.12': 'soljson-v0.6.12+commit.27d51765.js',
  '0.6.6':  'soljson-v0.6.6+commit.6c089d02.js',
  '0.5.17': 'soljson-v0.5.17+commit.d19bba13.js',
  '0.4.26': 'soljson-v0.4.26+commit.4563c3fc.js',
};

const importCache = {};

// Resolve relative path: resolvePath("@oz/token/ERC20/ERC20.sol", "./IERC20.sol") → "@oz/token/ERC20/IERC20.sol"
function resolvePath(parentPath, importPath) {
  if (!importPath.startsWith('.')) return importPath;
  const parentDir = parentPath.substring(0, parentPath.lastIndexOf('/') + 1);
  const combined = parentDir + importPath;
  // Normalize: resolve ../ and ./
  const parts = combined.split('/');
  const resolved = [];
  for (const part of parts) {
    if (part === '..') resolved.pop();
    else if (part !== '.') resolved.push(part);
  }
  return resolved.join('/');
}

// Convert logical path to GitHub raw URL
function pathToUrl(path) {
  if (path.startsWith('@openzeppelin/contracts/')) {
    const sub = path.replace('@openzeppelin/contracts/', '');
    return `https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/${sub}`;
  }
  if (path.startsWith('@openzeppelin/contracts-upgradeable/')) {
    const sub = path.replace('@openzeppelin/contracts-upgradeable/', '');
    return `https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts-upgradeable/v4.9.6/contracts/${sub}`;
  }
  if (path.startsWith('@chainlink/contracts/')) {
    const sub = path.replace('@chainlink/contracts/src/', '');
    return `https://raw.githubusercontent.com/smartcontractkit/chainlink/develop/contracts/src/${sub}`;
  }
  if (path.startsWith('https://') || path.startsWith('http://')) return path;
  return null;
}

async function fetchSource(path) {
  if (importCache[path]) return importCache[path];
  const url = pathToUrl(path);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const content = await res.text();
    importCache[path] = content;
    return content;
  } catch { return null; }
}

// Extract all import paths from source
function extractImports(content) {
  const imports = [];
  const re = /import\s+(?:[^"']*["']([^"']+)["']|["']([^"']+)["'])/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const imp = m[1] || m[2];
    if (imp) imports.push(imp);
  }
  return imports;
}

// Recursively resolve all imports
async function resolveAll(sources) {
  const resolved = { ...sources };
  const queue = [];

  // Find imports in initial sources
  for (const [filePath, src] of Object.entries(sources)) {
    for (const imp of extractImports(src.content || '')) {
      const abs = resolvePath(filePath, imp);
      if (!resolved[abs]) queue.push({ path: abs, from: filePath });
    }
  }

  const visited = new Set(Object.keys(sources));

  while (queue.length > 0) {
    const batch = queue.splice(0, queue.length);
    await Promise.all(batch.map(async ({ path, from }) => {
      if (visited.has(path)) return;
      visited.add(path);
      const content = await fetchSource(path);
      if (!content) return;
      resolved[path] = { content };
      // Find sub-imports
      for (const imp of extractImports(content)) {
        const abs = resolvePath(path, imp);
        if (!visited.has(abs)) {
          queue.push({ path: abs, from: path });
        }
      }
    }));
  }

  return resolved;
}

self.addEventListener('message', async (e) => {
  const { type, version, input } = e.data;

  if (type === 'load') {
    if (currentVersion === version && compiler) {
      self.postMessage({ type: 'loaded', version });
      return;
    }
    const filename = BUILDS[version] || BUILDS['0.8.20'];
    try {
      importScripts(`https://binaries.soliditylang.org/bin/${filename}`);
      const M = self.Module;
      if (!M) { self.postMessage({ type: 'error', error: 'Module not found' }); return; }
      const compile = M.cwrap('solidity_compile', 'string', ['string', 'number']);
      compiler = { compile, version };
      currentVersion = version;
      self.postMessage({ type: 'loaded', version });
    } catch (err) {
      self.postMessage({ type: 'error', error: err.message });
    }
  }

  if (type === 'compile') {
    if (!compiler) {
      self.postMessage({ type: 'result', error: 'Compiler not loaded' });
      return;
    }
    try {
      const inputObj = JSON.parse(input);
      // Resolve all imports recursively
      inputObj.sources = await resolveAll(inputObj.sources || {});
      const output = compiler.compile(JSON.stringify(inputObj));
      self.postMessage({ type: 'result', output });
    } catch (err) {
      self.postMessage({ type: 'result', error: err.message });
    }
  }
});
