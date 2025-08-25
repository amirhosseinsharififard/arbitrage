    // Obfuscate all .js files from dist into dist_protected using javascript-obfuscator
    import fs from 'fs';
    import path from 'path';
    import { fileURLToPath } from 'url';
    import obfuscator from 'javascript-obfuscator';

    const __filename = fileURLToPath(
        import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.resolve(__dirname, '..');
    const distDir = path.join(projectRoot, 'dist');
    const protectedDir = path.join(projectRoot, 'dist_protected');

    function ensureDirSync(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    function obfuscateFile(srcFile, destFile) {
        const code = fs.readFileSync(srcFile, 'utf8');
        const result = obfuscator.obfuscate(code, {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.75,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4,
            identifierNamesGenerator: 'hexadecimal',
            renameGlobals: false,
            selfDefending: true,
            stringArray: true,
            stringArrayThreshold: 0.75,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            splitStrings: true,
            splitStringsChunkLength: 8,
            transformObjectKeys: true,
            unicodeEscapeSequence: true
        });

        ensureDirSync(path.dirname(destFile));
        fs.writeFileSync(destFile, result.getObfuscatedCode(), 'utf8');
    }

    function copyNonJs(src, dest) {
        ensureDirSync(path.dirname(dest));
        fs.copyFileSync(src, dest);
    }

    function processDir(srcDir, destDir) {
        const entries = fs.readdirSync(srcDir, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(srcDir, entry.name);
            const destPath = path.join(destDir, entry.name);
            if (entry.isDirectory()) {
                processDir(srcPath, destPath);
            } else if (entry.isFile()) {
                if (entry.name.endsWith('.js')) {
                    obfuscateFile(srcPath, destPath);
                } else {
                    copyNonJs(srcPath, destPath);
                }
            }
        }
    }

    function clean(dir) {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }

    function main() {
        if (!fs.existsSync(distDir)) {
            console.error('dist/ does not exist. Run "npm run build" first.');
            process.exit(1);
        }
        console.log('🔒 Obfuscating dist → dist_protected ...');
        clean(protectedDir);
        ensureDirSync(protectedDir);
        processDir(distDir, protectedDir);
        console.log('✅ Obfuscation complete. Output: dist_protected/');
    }

    main();