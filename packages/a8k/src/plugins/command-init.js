import logger from '@a8k/cli-utils/logger';
import getNpmCommand from '@a8k/cli-utils/npm';
import { logWithSpinner, stopSpinner } from '@a8k/cli-utils/spinner';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import os from 'os';
import path from 'path';
import shell from 'shelljs';
import util from 'util';

const initChoices = [
  { name: '添加 提交前 lint 和 prettier', value: 'lint' },
  { name: '添加 commit msg规范检测', value: 'commit' },
  { name: '添加 jsconfig ', value: 'jsconfig' },
];
export default {
  apply: context => {
    context
      .registerCommand('init [type]')
      .description('给项目添加额外能力')
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
        const cwd = context.options.baseDir;
        const choice = initChoices.find(i => i.value === type);
        if (choice) {
          const pkgFile = path.join(cwd, 'package.json');
          const pkg = require(pkgFile);
          shell.cd(cwd);
          const npmCmd = getNpmCommand();
          switch (type) {
            case 'lint':
              {
                pkg['lint-staged'] = {
                  '*.{js,jsx,json,css,scss,md}': ['prettier --write', 'git add'],
                  '*.{css,scss}': ['stylelint --fix', 'git add'],
                  '*.{jsx,js}': ['prettier --write', 'eslint --fix', 'git add'],
                };
                pkg.scripts = pkg.scripts || {};
                if (!pkg.scripts.stylelint) {
                  pkg.scripts.stylelint = 'stylelint --fix src/**/*.{scss,css}';
                }
                if (!pkg.scripts.eslint) {
                  pkg.scripts.eslint = 'eslint --fix src/**/*.{js,jsx}';
                }
                pkg.husky = pkg.husky || {};
                pkg.husky.hooks = pkg.husky.hooks || {};
                pkg.husky.hooks['pre-commit'] = 'lint-staged';
                logWithSpinner('添加配置信息');
                fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));
                const stylelintFile = path.join(cwd, '.stylelintrc.js');
                if (!fs.existsSync(stylelintFile)) {
                  fs.writeFileSync(
                    stylelintFile,
                    `
module.exports = {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-scss'],
  rules: {
    'at-rule-no-unknown': null,
    'scss/at-rule-no-unknown': true,
  },
};
`
                  );
                }

                logWithSpinner('安装依赖中');
                const deps = [
                  'eslint',
                  'stylelint',
                  'stylelint-config-standard',
                  'stylelint-scss',
                  'prettier',
                  'husky',
                  'lint-staged',
                ];
                await util.promisify(shell.exec)(`${npmCmd} i ${deps.join(' ')} -D`, {
                  silent: false,
                });

                stopSpinner();
              }
              break;
            case 'commit': {
              logWithSpinner('安装依赖中');
              await util.promisify(shell.exec)(`${npmCmd} i commitlint-config-imt -D`, {
                silent: true,
              });
              logWithSpinner('初始化commit配置');
              const cmd = `./node_modules/.bin/imt-commit${
                os.platform() === 'win32' ? '.cmd' : ''
              }`;
              await util.promisify(shell.exec)(cmd, { silent: true });
              stopSpinner();
              break;
            }
            case 'jsconfig': {
              logWithSpinner('添加jsconfig配置信息');
              const jsconfig = path.join(cwd, 'jsconfig.json');
              if (!fs.existsSync(jsconfig)) {
                fs.writeFileSync(
                  jsconfig,
                  `
{
  "compilerOptions": {
    "baseUrl": ".",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "paths": {
      "assets/*": ["./src/assets/*"],
      "components/*": ["./src/components/*"],
      "pages/*": ["./src/pages/*"]
    }
  }
}               
`
                );
              } else {
                stopSpinner();
                logger.warn('jsconfig配置已经存在');
              }
              stopSpinner();
              break;
            }
            default:
          }
        } else {
          logger.error(`不支持该选项: ${type}`);
          options.outputHelp();
        }
      });
  },
  name: 'builtin:add',
};
