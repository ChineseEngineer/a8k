#!/usr/bin/env node
import program from 'commander';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import shell from 'shelljs';
import util from 'util';
import { sync as commandExists } from 'command-exists';
import os from 'os';
import pkg from '../../package.json';
import getOptions from '../utils/getOptions';
import spinner, { logWithSpinner, stopSpinner } from '../utils/spinner';
import { error } from '../utils/logger';

const cwd = process.cwd();
// 自动版本检测
require('../scripts/check_latest');

process.on('unhandledRejection', err => {
  throw err;
});

program
  .version(pkg.version)
  .option('-P, --proxy <proxy>', '设置代理')
  .option('-x, --defaultProxy', '使用内网代理', false);

program
  .command('create [dir]')
  .description('初始化项目')
  .action((dir, options) => {
    require('../commands/create')(dir, options);
  });

program
  .command('dev')
  .description('启动开发者模式')
  .option('-s, --ssr', '服务端渲染开发调试')
  .option('-p, --port <port>', '配置开发者服务器监听端口')
  .option('--cache-dir <dir>', '编译阶段缓存目录,加速二次编译')
  .option('--no-eslint', '禁用eslint检测代码')
  .option('-c, --css-source-map', '使用cssSourceMap ，但会导致开发模式 FOUC')
  .action(options => {
    require('../commands/dev')(options);
  });

program
  .command('build')
  .description('构建生产包')
  .option('-d, --dist <dist>', '配置构建文件生成目标目录')
  .option('-a, --analyzer', '开启构建分析', false)
  .option('-m, --use-smp', '分析构建耗时', false)
  .option('-s, --source-map', '是否生成source-map,默认false', false)
  .option('--no-mini', '禁用压缩代码')
  .option('--cache-dir <dir>', '编译阶段缓存目录,加速二次编译')
  .option('--no-silent', '输出日志')
  .option('--dev', '环境变量使用development')
  .action(options => {
    require('../commands/build').default(options);
  });

program
  .command('test')
  .description('运行 jest 测试')
  .option('--coverage', 'coverage')
  .option('--watchAll', 'watch')
  .option('--env', 'environment')
  .action(options => {
    require('../commands/test')(options);
  });

program
  .command('check')
  .description('检测代码是否合并主干')
  .action(options => {
    require('../commands/check.js')(options);
  });
program
  .command('clean')
  .description('清理缓存文件')
  .action(async () => {
    spinner.logWithSpinner('清理缓存');
    const options = getOptions({});
    await fs.emptyDir(options.cache);
    spinner.stopSpinner();
  });
program
  .command('cache <cmd>')
  .description('缓存node_modules加速构建,使用方法：imt cache [cmd]. cmd 是配置的 npm scripts key')
  .action(async cmd => {
    const options = getOptions({});
    const cache = require('../scripts/cache');
    cache({ cmd, cache: options.cache });
  });

program
  .command('add [type]')
  .description('添加页面或者组件, type 支持 page(p),component(c)')
  .action(async (type, options) => {
    const choices = [{ name: '添加 组件', value: 'component' }, { name: '添加 页面', value: 'page' }];
    if (!type) {
      ({ type } = await inquirer.prompt([
        {
          type: 'list',
          name: 'type',
          message: '选择初始化内容！',
          choices,
        },
      ]));
    } else if (type.length === 1) {
      type = { c: 'component', p: 'page' }[type];
    }
    const choice = choices.find(i => i.value === type);
    if (choice) {
      console.log(type);
    } else {
      error(`不支持该选项: ${type}`);
      options.outputHelp();
    }
  });
const initChoices = [
  { name: '添加 提交前 lint 和 prettier', value: 'lint' },
  { name: '添加 commit msg规范检测', value: 'commit' },
];
program
  .command('init [type]')
  .description('添加eslint、commitmsg校验, 支持:lint,commit')
  .action(async (type, options) => {
    if (!type) {
      ({ type } = await inquirer.prompt([
        {
          type: 'list',
          name: 'type',
          message: '选择初始化内容！',
          choices: initChoices,
        },
      ]));
    }
    const choice = initChoices.find(i => i.value === type);
    if (choice) {
      const pkgFile = path.join(cwd, 'package.json');
      const pPkg = require(pkgFile);
      shell.cd(cwd);
      let npmCmd = 'npm';
      if (commandExists('tnpm')) {
        npmCmd = 'tnpm';
      }
      switch (type) {
        case 'lint':
          pPkg['lint-staged'] = {
            '*.{json,css,scss,md}': ['prettier --write', 'git add'],
            '*.{jsx,js}': ['prettier --write', 'eslint --fix', 'git add'],
          };
          pPkg.husky = pPkg.husky || {};
          pPkg.husky.hooks = pPkg.husky.hooks || {};
          pPkg.husky.hooks['pre-commit'] = 'lint-staged';
          logWithSpinner('添加配置信息');
          fs.writeFileSync(pkgFile, JSON.stringify(pPkg, null, 2));
          logWithSpinner('安装依赖：husky,prettier,lint-staged');
          await util.promisify(shell.exec)(`${npmCmd} i husky prettier lint-staged -D`, { silent: true });
          stopSpinner();
          break;
        case 'commit': {
          logWithSpinner('安装依赖：commitlint-config-imt');
          await util.promisify(shell.exec)(`${npmCmd} i commitlint-config-imt -D`, { silent: true });
          logWithSpinner('初始化commit配置');
          const cmd = `./node_modules/.bin/imt-commit${os.platform() === 'win32' ? '.cmd' : ''}`;
          await util.promisify(shell.exec)(cmd, { silent: true });
          stopSpinner();
          break;
        }
        default:
      }
    } else {
      error(`不支持该选项: ${type}`);
      options.outputHelp();
    }
  });

program.command('*').action(options => {
  error(`找不到命令: ${options}`);
  program.outputHelp();
});
program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
