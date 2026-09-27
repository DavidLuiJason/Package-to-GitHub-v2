import JSZip from 'jszip';
import { ArchivePackage } from './archiveReader';

export interface SampleProjectInfo {
  id: string;
  name: string;
  description: string;
  tag: string;
  recommendedRepoName: string;
}

export const SAMPLE_PROJECTS: SampleProjectInfo[] = [
  {
    id: 'vite-react',
    name: 'Vite + React Modern Web App',
    description: 'Standard flat layout: src/, public/, package.json, vite.config.ts, tsconfig.json',
    tag: 'Flat Root',
    recommendedRepoName: 'vite-react-app',
  },
  {
    id: 'wrapped-python',
    name: 'Python Flask App with Outer Wrapper',
    description: 'Contained inside outer folder "axon-source/" — tests automatic wrapper detection and root stripping',
    tag: 'Outer Wrapper',
    recommendedRepoName: 'flask-api-service',
  },
  {
    id: 'fullstack-ts',
    name: 'TypeScript Node Fullstack Project',
    description: 'Client, server, and shared directories with tsconfig and configs',
    tag: 'Multi-folder',
    recommendedRepoName: 'ts-fullstack-starter',
  },
];

export async function generateSampleArchive(sampleId: string): Promise<ArchivePackage> {
  const zip = new JSZip();

  if (sampleId === 'vite-react') {
    zip.file(
      'package.json',
      JSON.stringify(
        {
          name: 'vite-react-starter',
          private: true,
          version: '1.0.0',
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'vite build',
          },
          dependencies: {
            react: '^19.0.0',
            'react-dom': '^19.0.0',
          },
          devDependencies: {
            '@vitejs/plugin-react': '^4.3.0',
            typescript: '^5.5.0',
            vite: '^6.0.0',
          },
        },
        null,
        2
      )
    );

    zip.file(
      'vite.config.ts',
      `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`
    );

    zip.file(
      'tsconfig.json',
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'bundler',
            jsx: 'react-jsx',
            strict: true,
          },
          include: ['src'],
        },
        null,
        2
      )
    );

    zip.file(
      'index.html',
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
    );

    zip.file(
      'src/main.tsx',
      `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
    );

    zip.file(
      'src/App.tsx',
      `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="container">
      <h1>Pack2Git Published Project</h1>
      <button onClick={() => setCount((c) => c + 1)}>
        Count is {count}
      </button>
    </div>
  );
}
`
    );

    zip.file(
      'src/index.css',
      `body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background-color: #0f172a;
  color: #f8fafc;
  display: grid;
  place-items: center;
  min-height: 100vh;
}
`
    );

    zip.file(
      'public/favicon.svg',
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#38bdf8"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`
    );

    zip.file(
      'README.md',
      `# Vite + React Starter

Created with Pack2Git — Turn a project package into a real GitHub repository.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`
`
    );

    const blob = await zip.generateAsync({ type: 'arraybuffer' });
    return ArchivePackage.fromArrayBuffer(blob, 'vite-react-project.zip', blob.byteLength);
  }

  if (sampleId === 'wrapped-python') {
    // Has wrapper folder: axon-source/
    const prefix = 'axon-source/';

    zip.file(
      `${prefix}requirements.txt`,
      `flask>=3.0.0
gunicorn>=21.2.0
pydantic>=2.6.0
python-dotenv>=1.0.0
pytest>=8.0.0
`
    );

    zip.file(
      `${prefix}app.py`,
      `from flask import Flask, jsonify, request
import os

app = Flask(__name__)

@app.route("/")
def home():
    return jsonify({
        "status": "healthy",
        "service": "Flask API",
        "source": "Pack2Git published"
    })

@app.route("/api/ping")
def ping():
    return jsonify({"message": "pong"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
`
    );

    zip.file(
      `${prefix}src/services.py`,
      `def calculate_metrics(items):
    return {
        "count": len(items),
        "processed": True
    }
`
    );

    zip.file(
      `${prefix}tests/test_app.py`,
      `from app import app

def test_home():
    client = app.test_client()
    response = client.get("/")
    assert response.status_code == 200
`
    );

    zip.file(
      `${prefix}Dockerfile`,
      `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
`
    );

    zip.file(
      `${prefix}README.md`,
      `# Flask API Service

Published to GitHub via Pack2Git.
Notice how the outer \`axon-source/\` container folder was automatically detected and stripped so these project files sit directly at the root of the repository!
`
    );

    const blob = await zip.generateAsync({ type: 'arraybuffer' });
    return ArchivePackage.fromArrayBuffer(blob, 'axon-python-source.zip', blob.byteLength);
  }

  // TypeScript fullstack starter
  zip.file(
    'package.json',
    JSON.stringify(
      {
        name: 'ts-fullstack-app',
        private: true,
        scripts: {
          build: 'tsc',
          start: 'node dist/index.js',
        },
        dependencies: {
          express: '^4.21.0',
        },
        devDependencies: {
          typescript: '^5.5.0',
          '@types/node': '^22.0.0',
        },
      },
      null,
      2
    )
  );

  zip.file(
    'tsconfig.json',
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          outDir: './dist',
          strict: true,
        },
        include: ['src/**/*'],
      },
      null,
      2
    )
  );

  zip.file(
    'src/index.ts',
    `import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`
  );

  zip.file(
    'src/config/env.ts',
    `export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development'
};
`
  );

  zip.file('README.md', '# TypeScript Fullstack App\n\nPublished via Pack2Git.');

  const blob = await zip.generateAsync({ type: 'arraybuffer' });
  return ArchivePackage.fromArrayBuffer(blob, 'ts-fullstack-starter.zip', blob.byteLength);
}
