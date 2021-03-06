# a8k 文档

## 使用方法

安装

```shell
npm i -g a8k
```

创建项目

```shell
mkdir test && cd test

k create
```

启动开发服务器

```shell
k dev
```

开发模式调试直出代码

```shell
k dev -s
```

构建前端代码

```shell
k build
```

运行 jest 测试

```shell
k test
```

## 模板项目目录结构

为了规范化项目，我们的模板项目规定了最基本的文件结构如下：

```
├── src 源代码目录
|   ├── assets  公共资源目录
|   |   ├── css  公共样式
|   |   ├── images 公共图片
|   |   ├── polyfill.js 填充库
|   |   ├── rem.js 
|   |   ├── template.html html模板
|   |   └── vendor.js 第三方库
|   ├── components 公共组件
|   |   ├── Example
|   ├── pages 页面目录
|   |   ├── index 页面(url路径以目录名命名)
├── .commitlintrc.js commit信息规范配置
├── .editorconfig 编辑器格式化同步
├── .eslintrc.js eslint配置
├── .gitignore  git 忽略文件配置
├── .gitmessage commit提示信息
├── .prettierrc prettier 格式化配置
├── a8k.config.js a8k构建配置
├── jsconfig.json jsconfig配置，为了让vscode支持绝对路径智能感知
└── package.json
```

## 现有项目如何接入？

在项目根目录添加配置文件:`a8k.config.js`
添加如下配置：

```js
const publicPath = '//7.url.cn/fudao/pc/';
module.exports = {
  // 标示是多页面还是单页面应用:single/multi
  mode: 'multi',
  // dist 目录
  dist: 'public/cdn',
  // 加快热构建的缓存目录
  cache: '/tmp/fudao_qq_com_pc',
  // 是否将 JS 标签配置 crossOrigin='anonymous'
  // 配置babel需要处理的模块或者忽略的模块，支持正则和绝对路径
  babel:{
    include:[],
    exclude:[]
  },
  crossOrigin: false,
  // webpack-dev-server配置
  devServer: {
    port: 7475,
  },
  // 主域重试
  retry: {
    // 重试地址
    retryPublicPath: '//fudao.qq.com/pc/',
    // 排除非我们自己控制的JS
    exclude: [/\/\/sqimg\.qq\.com/],
  },
  // 服务器直出页面
  ssrConfig: {
    // js存放目录
    // dist:'',// 默认：'node_modules/components'
    // html存放目录
    // view:'',//默认: 'app/views'
    // 入口文件
    entry: {
      providerDiscover: './src/pages/discover/ProviderDiscover',
      providerCourse: './src/pages/course/ProviderCourse',
      providerSearch: './src/pages/search/ProviderSearch',
    },
  },
  // cdn部署路径
  publicPath,
  // pages目录下需要忽略的文件夹（不作为页面处理）
  ignorePages: ['action_creators', 'action_types', 'reducers'],
  chainWebpack(config, { type, mode }) {
    if (type === 'client') {
      // 客户端代构建
      if (mode === 'production') {
        // 生产模式代码
        config.plugin('pwa').use(require('xxx'), [params1, params2]);
      } else {
        // 开发模式代码
      }
    }
    if (type === 'server') {
      // 服务器代码构建
      if (mode === 'production') {
        // 生产模式代码
      } else {
        // 开发模式代码
      }
    }
  },
};
```

## 帮助

```shell
k -h
```
