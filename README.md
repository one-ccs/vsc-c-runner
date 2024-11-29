# VSC C Runner

编译并运行 C 工程项目，支持多文件编译、支持链接库文件，先编译后链接，自动识别未更改文件，不会重复编译，提高开发效率。

灵感来自于 [C/C++ Runner](https://github.com/franneck94/vscode-c-cpp-runner)

## 使用

1、在 `.vscode/settings.json` 中修改配置，添加编译器路径，添加要编译的文件
2、点击 `编译并运行按钮` 等待编译完成，运行程序

## 依赖

无

## 设置

打开 [C Project Runner](vscode://settings/C_Runner.buildPath) 设置 -> 修改对应设置

- (includes)[vscode://settings/C_Runner.includes] 包含文件或文件夹
- (excludes)[vscode://settings/C_Runner.excludes] 排除文件或文件夹
- (buildPath)[vscode://settings/C_Runner.buildPath] 编译文件保存路径
- (resCompilerPath)[vscode://settings/C_Runner.resCompilerPath] 资源编译器路径 (用于编译 ".rc" 文件)
- (compilerPath)[vscode://settings/C_Runner.compilerPath] 编译器路径
- (compilerOptions)[vscode://settings/C_Runner.compilerOptions] 编译器选项
- (linkerLibs)[vscode://settings/C_Runner.linkerLibs] 要链接的库, 例: ["ws2_32", "sqlite3"]
- (linkerLibPaths)[vscode://settings/C_Runner.linkerLibPaths] 链接库文件路径, 例: ["src/sqlite3"]
- (runArgs)[vscode://settings/C_Runner.runArgs] 运行参数
