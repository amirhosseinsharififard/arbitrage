// Simple build script to create a dist folder with runtime files
// Copies server entry points, src code, and public assets
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

function ensureDirSync(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function copyFileSync(srcFile, destFile) {
    ensureDirSync(path.dirname(destFile));
    fs.copyFileSync(srcFile, destFile);
}

function copyRecursiveSync(src, dest) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        ensureDirSync(dest);
        for (const item of fs.readdirSync(src)) {
            copyRecursiveSync(path.join(src, item), path.join(dest, item));
        }
    } else {
        copyFileSync(src, dest);
    }
}

function removeSyncSafe(target) {
    if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
    }
}

function build() {
    console.log('🧹 Cleaning dist...');
    removeSyncSafe(distDir);
    ensureDirSync(distDir);

    const itemsToCopy = [
        // Entry points
        { src: path.join(projectRoot, 'index.js'), dest: path.join(distDir, 'index.js') },
        { src: path.join(projectRoot, 'web_interface.js'), dest: path.join(distDir, 'web_interface.js') },
        // Source code
        { src: path.join(projectRoot, 'src'), dest: path.join(distDir, 'src') },
        // Public assets
        { src: path.join(projectRoot, 'public'), dest: path.join(distDir, 'public') },
        // Config templates (if present)
        { src: path.join(projectRoot, 'config.example.js'), dest: path.join(distDir, 'config.example.js'), optional: true },
        { src: path.join(projectRoot, 'env.example'), dest: path.join(distDir, 'env.example'), optional: true }
    ];

    console.log('📦 Copying files to dist...');
    for (const item of itemsToCopy) {
        if (item.optional && !fs.existsSync(item.src)) {
            continue;
        }
        if (!fs.existsSync(item.src)) {
            console.warn(`⚠️  Skipping missing: ${path.relative(projectRoot, item.src)}`);
            continue;
        }
        copyRecursiveSync(item.src, item.dest);
    }

    console.log('✅ Build completed. Output in dist/');
}

build();