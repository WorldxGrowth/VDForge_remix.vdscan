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

self.addEventListener('message', async (e) => {
  const { type, version, input } = e.data;

  if (type === 'load') {
    if (currentVersion === version && compiler) {
      self.postMessage({ type: 'loaded', version });
      return;
    }

    const filename = BUILDS[version] || BUILDS['0.8.23'];

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
      const output = compiler.compile(input, 1);
      self.postMessage({ type: 'result', output });
    } catch (err) {
      self.postMessage({ type: 'result', error: err.message });
    }
  }
});
