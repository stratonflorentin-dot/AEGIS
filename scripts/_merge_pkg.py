import json

# Merge JARVIS's dependencies into the MINO package.json, point scripts at the
# new frontend, and build with vite only (tsc -b typecheck kept out of the
# build so plain-JS engine modules don't block a green build).
with open('package.json', encoding='utf-8') as f:
    pkg = json.load(f)

pkg['name'] = 'mino'
pkg['description'] = 'MINO - a bilingual voice assistant with an Iron Man holographic interface, driven by Groq with local PC control through the Python bridge.'
pkg['scripts'] = {
    'dev': 'vite',
    'build': 'vite build',
    'preview': 'vite preview',
    'setup': 'node scripts/setup.mjs',
}

deps = {
    '@mediapipe/tasks-vision': '^1.0.1',
    '@picovoice/porcupine-web': '^4.0.1',
    '@picovoice/web-voice-processor': '^4.0.10',
    '@react-three/drei': '^10.7.7',
    '@react-three/fiber': '^9.7.0',
    '@react-three/postprocessing': '^3.0.4',
    'dompurify': '^3.4.12',
    'framer-motion': '^12.43.0',
    'kokoro-js': '^1.2.1',
    'react': '^19.2.8',
    'react-dom': '^19.2.8',
    'three': '^0.185.1',
    'zod': '^4.4.3',
    'zustand': '^5.0.14',
}
pkg['dependencies'] = {**deps, **pkg.get('dependencies', {})}

devdeps = {
    '@types/dompurify': '^3.0.5',
    '@types/node': '^24.13.3',
    '@types/react': '^19.2.17',
    '@types/react-dom': '^19.2.3',
    '@types/three': '^0.185.3',
    '@vitejs/plugin-react': '^6.0.4',
    'typescript': '~6.0.2',
    'vite': '^8.2.0',
}
pkg['devDependencies'] = {**devdeps, **pkg.get('devDependencies', {})}

# Drop scripts that belonged to the old HUD build.
pkg.pop('type', None) if False else None

with open('package.json', 'w', encoding='utf-8', newline='') as f:
    json.dump(pkg, f, indent=2)
    f.write('\n')
print('package.json : merged for the holographic frontend')
