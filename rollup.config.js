import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import vue from 'rollup-plugin-vue';
import postcss from 'rollup-plugin-postcss';

export default {
    input: 'src/index.js',
    output: [
        {
            file: 'dist/vue-softphone.js',
            format: 'cjs',
            exports: 'named'
        },
        {
            file: 'dist/vue-softphone.esm.js',
            format: 'es'
        }
    ],
    external: [
        'vue',
        '@fortawesome/fontawesome-svg-core',
        '@fortawesome/free-solid-svg-icons',
        '@fortawesome/vue-fontawesome'
    ],
    plugins: [
        resolve(),
        commonjs(),
        vue({
            css: true,
            compileTemplate: true,
            template: { optimizeSSR: false }
        }),
        postcss({
            config: {
                path: './postcss.config.js'
            },
            extensions: ['.css', '.scss', '.sass', '.postcss', '.sss'],
            minimize: true
        })
    ]
}