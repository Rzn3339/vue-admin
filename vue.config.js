/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
function resolve(dir) {
  return path.join(__dirname, dir);
}
const _mode = process.env.NODE_ENV;
const serve = "http://172.10.10.13:8080/";
console.log("_mode环境变量：", _mode);
module.exports = {
  lintOnSave: false,
  productionSourceMap: false,
  assetsDir: "assets",
  // 生产环境，项目部署在服务器子目录cms下，用于查找静态资源
  publicPath: _mode === "development" ? "/" : "/cms/",
  devServer: {
    proxy: {
      "/api": {
        target: serve,
        changeOrigin: true,
        pathRewrite: {
          "^/api": "",
        },
      },
    },
  },

  css: {
    extract: true, // 解决开发模式，打包时未提取CSS的问题
    loaderOptions: {
      scss: {
        additionalData: `@import "./src/styles/main.scss";`,
      },
    },
  },
  configureWebpack: {
    resolve: {
      alias: {
        "@": resolve("src"),
        "vue-i18n": "vue-i18n/dist/vue-i18n.cjs.js", // 解决国际化预警
      },
    },
  },
  runtimeCompiler: true, // 解决菜单栏 template 模版编译问题

  chainWebpack: (config) => {
    // 优化首屏加载速度--移除 preload & prefetch 插件
    config.plugins.delete("preload");
    config.plugins.delete("prefetch");

    // 解决 isCustomElement 预警
    config.module
      .rule("vue")
      .use("vue-loader")
      .tap((options) => {
        options.compilerOptions = {
          ...options.compilerOptions,
          isCustomElement: (tag) => tag.startsWith("svg-"),
        };
        return options;
      });
    // 配置识别 svg 规则
    const svgRule = config.module.rule("svg");
    svgRule.uses.clear();
    svgRule
      .test(/\.svg$/)
      .include.add(resolve("src/assets/icons"))
      .end()
      .use("svg-sprite-loader")
      .loader("svg-sprite-loader")
      .options({
        symbolId: "icon-[name]",
      });
    const fileRule = config.module.rule("file");
    fileRule.uses.clear();
    fileRule
      .test(/\.svg$/)
      .exclude.add(resolve("src/assets/icons"))
      .end()
      .use("file-loader")
      .loader("file-loader");

    config.when(_mode === "production", (config) => {
      config.optimization.splitChunks({
        chunks: "all",
        cacheGroups: {
          libs: {
            name: "chunk-libs",
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: "initial", // only package third parties that are initially dependent
          },
          elementUI: {
            name: "chunk-antDesignUI", // split antDesignUI into a single package
            priority: 20, // the weight needs to be larger than libs and app or it will be packaged into libs or app
            test: /[\\/]node_modules[\\/]_?ant-design-vue(.*)/, // in order to adapt to cnpm
          },
          commons: {
            name: "chunk-commons",
            test: resolve("src/components"),
            minChunks: 3,
            priority: 5,
            reuseExistingChunk: true, // 表示是否使用已有的chunk，如果为true，则表示如果当前的 chunk 包含的模块已经被抽取出去了，那么将不会重新生成新的。
          },
        },
      });
      // https:// webpack.js.org/configuration/optimization/#optimizationruntimechunk
      config.optimization.runtimeChunk("single");
    });
  },
};
