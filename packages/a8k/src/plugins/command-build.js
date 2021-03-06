import logger from '@a8k/cli-utils/logger';
import { logWithSpinner, stopSpinner } from '@a8k/cli-utils/spinner';
import fs from 'fs-extra';
import { ENV_PROD, TYPE_CLIENT, TYPE_SERVER, ENV_DEV } from '../const';

export default {
  apply: context => {
    const { hooks } = context;
    context
      .registerCommand('build')
      .description('构建生产包')
      .option('-a, --analyzer', '开启构建分析')
      // .option('-m, --use-smp', '分析构建耗时')
      .option('-s, --source-map', '是否生成source-map,默认false')
      .option('--no-mini', '禁用压缩代码')
      .option('--no-silent', '输出日志')
      .option('--dev', '环境变量使用 development')
      .option('--inspectWebpack', '输出webpack配置信息')
      .action(async ({ dev, analyzer, inspectWebpack, sourceMap, mini, silent }) => {
        // 为了让react这样的库不要使用压缩代码
        process.env.NODE_ENV = dev ? ENV_DEV : ENV_PROD;

        context.options.inspectWebpack = inspectWebpack;
        context.internals.mode = ENV_PROD;

        const options = {
          sourceMap,
          mini,
          silent,
          analyzer,
        };

        logger.info('build frontend');

        if (silent) {
          process.noDeprecation = true;
        }

        // if (useSmp) {
        //   const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
        //   const smp = new SpeedMeasurePlugin();
        //   config = smp.wrap(config);
        // }

        await hooks.invokePromise('beforeBuild', context);
        logWithSpinner('clean frontend dist dir.');
        stopSpinner();

        fs.emptyDirSync(context.config.dist);
        const webpackConfig = context.resolveWebpackConfig({
          ...options,
          type: TYPE_CLIENT,
        });
        const compiler = context.createWebpackCompiler(webpackConfig);
        compiler.hooks.done.tap('done', stats => {
          if (stats.hasErrors()) {
            process.exit(-1);
          }
        });
        await context.runCompiler(compiler);
        await hooks.invokePromise('afterBuild', context);

        const { ssrConfig } = context.config;
        if (ssrConfig) {
          logger.info('build ssr');
          await hooks.invokePromise('beforeSSRBuild', context);

          fs.emptyDirSync(ssrConfig.dist);
          fs.emptyDirSync(ssrConfig.view);
          logWithSpinner('clean ssr dist dir.');
          stopSpinner();

          const webpackConfigSSR = context.resolveWebpackConfig({
            ...options,
            type: TYPE_SERVER,
          });
          const compilerSSR = context.createWebpackCompiler(webpackConfigSSR);
          compilerSSR.hooks.done.tap('done', stats => {
            if (stats.hasErrors()) {
              process.exit(-1);
            }
          });
          await context.runCompiler(compilerSSR);
          // await context.runWebpack(webpackConfigSSR);
          await context.hooks.invokePromise('afterSSRBuild', context);
        }
      });
  },
  name: 'builtin:build',
};
