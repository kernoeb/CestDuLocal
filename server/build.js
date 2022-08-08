const {commonjs} = require("@hyrious/esbuild-plugin-commonjs");
const copyStaticFiles = require('esbuild-copy-static-files')
const textReplace = require('esbuild-plugin-text-replace')
const replace = require('replace-in-file');

const nativeNodeModulesPlugin = {
    name: 'native-node-modules', setup(build) {
        // If a ".node" file is imported within a module in the "file" namespace, resolve
        // it to an absolute path and put it into the "node-file" virtual namespace.
        build.onResolve({filter: /\.node$/, namespace: 'file'}, args => {
            console.log(args.path)
            return ({
                path: require.resolve(args.path, {paths: [args.resolveDir]}), namespace: 'node-file',
            })
        })

        // Files in the "node-file" virtual namespace call "require()" on the
        // path from esbuild of the ".node" file in the output directory.
        build.onLoad({filter: /.*/, namespace: 'node-file'}, args => {
            console.log(args.path)
            return ({
                contents: `
        import path from ${JSON.stringify(args.path)}
        try { module.exports = require(path) }
        catch (err) { console.error(err)}
    `,
            })
        })

        // If a ".node" file is imported within a module in the "node-file" namespace, put
        // it in the "file" namespace where esbuild's default loading behavior will handle
        // it. It is already an absolute path since we resolved it to one above.
        build.onResolve({filter: /\.node$/, namespace: 'node-file'}, args => {
            console.log(args.path)
            return ({
                path: args.path, namespace: 'file',
            })
        })

        // Tell esbuild's default loading behavior to use the "file" loader for
        // these ".node" files.
        let opts = build.initialOptions
        opts.loader = opts.loader || {}
        opts.loader['.node'] = 'file'
    },
}

const platform = process.platform
const arch = process.arch
const processVersionModules = process.versions.modules

console.log(`Building for ${platform} ${arch} with node ${processVersionModules}`)

require("esbuild").build({
    entryPoints: ["app.mjs"],
    bundle: true,
    format: "esm",
    target: "node16.16.0",
    outfile: "../dist/app.mjs",
    plugins: [
        nativeNodeModulesPlugin,
        commonjs(),
        textReplace({
            pattern: [
                ["process.platform", "\"" + platform + "\""],
                ["process.arch", "\"" + arch + "\""],
                ["process.versions.modules", "\"" + processVersionModules + "\""]
            ],
            include: /uws.js$/
        }),
        textReplace({
            pattern: [
                ['/../public/dist/', "./dist/"]
            ],
            include: /.mjs$/
        }),
        copyStaticFiles({
            src: '../public/dist/',
            dest: '../dist/dist/',
            dereference: true,
            errorOnExist: false,
            preserveTimestamps: false,
            recursive: true
        })
    ],
    platform: "node",
    external: ["./node_modules/"],
    minifyWhitespace: true,
    minifySyntax: true,
    minifyIdentifiers: true,
    keepNames: true,
    banner: {
        js: 'import { createRequire } from \'module\';const require = createRequire(import.meta.url);'
    },
})
    .then(async () => {
        console.log("Build complete")
        const regex = `\.\/uws\_${platform}\_${arch}\_${processVersionModules}-[A-Z0-9]{0,8}\.node`
        await replace({
            files: '../dist/app.mjs',
            // ./uws_darwin_arm64-truc.node
            from: new RegExp(regex, 'm'),
            to: "./uws_\"+process.platform+\"_\"+process.arch+\"_\"+process.versions.modules+\".node",
        })
    })
    .catch(() => process.exit(1));
