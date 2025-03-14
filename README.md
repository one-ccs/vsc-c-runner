# C Project Runner

编译并运行 C 工程项目，支持批量转换文件编码，多文件编译，支持链接库文件，支持自动识别未更改文件，不会重复编译，提高开发效率。

支持:

- 批量转换文件编码
- 多文件编译
- 链接库文件
- 编译并链接资源文件
- 仅编译更改的文件
- 自动拷贝公共文件
- 编译参数
- 链接参数
- 运行参数

灵感来自于 [C/C++ Runner](https://github.com/franneck94/vscode-c-cpp-runner)

## 使用

1、在 `.vscode/settings.json` 中修改配置，添加编译器路径，添加要编译的文件, 例:

```json
{
    "C_Project_Runner.includes": [
        "main.c",
        "lib/**/*.c",
        "src/**/*.rc",
        "func/**/*.c",
    ],
    "C_Project_Runner.linkerLibs": [
        "ws2_32",
        "sqlite3",
    ],
    "C_Project_Runner.linkerLibPaths": [
        "src/sqlite3",
    ]
}
```

2、点击 `编译并运行按钮` 等待编译完成，自动运行程序。

## 快捷键

- `Ctrl+F5` 编译并运行

## 依赖

无

## 设置

打开 [C Project Runner](vscode://settings/C_Project_Runner.buildPath) 设置 -> 修改对应设置

- [includes](vscode://settings/C_Project_Runner.includes) 包含源文件的 glob 规则
- [excludes](vscode://settings/C_Project_Runner.excludes) 排除源文件的 glob 规则 (仅支持 ** 和 *)
- [buildPath](vscode://settings/C_Project_Runner.buildPath) 编译文件保存路径
- [resCompilerPath](vscode://settings/C_Project_Runner.resCompilerPath) 资源编译器路径 (用于编译 ".rc" 文件)
- [compilerPath](vscode://settings/C_Project_Runner.compilerPath) 编译器路径
- [compilerOptions](vscode://settings/C_Project_Runner.compilerOptions) 编译器选项
- [linkerLibs](vscode://settings/C_Project_Runner.linkerLibs) 要链接的库, 例: ["ws2_32", "sqlite3"]
- [linkerLibPaths](vscode://settings/C_Project_Runner.linkerLibPaths) 链接库文件路径 (注: 链接库需要拷贝到可执行文件所在目录), 例: ["src/sqlite3"]
- [runArgs](vscode://settings/C_Project_Runner.runArgs) 运行参数

## 补充说明

### 库文件使用方式

以 sqlite3 为例，在官网可以下载到 `sqlite3.c`、`sqlite3.h`、`sqlite3ext.h`、`sqlite3.dll` 四个文件。

- 直接使用 C 源文件
  1. 将 `sqlite3.c`、`sqlite3.h`、`sqlite3ext.h` 作为项目文件使用，无需额外配置
  2. 与项目文件一起编译并链接，此时 sqlite3 库代码会直接打包到 exe 中。

- 使用 dll 文件：
   1. 项目中正常 "#include" `sqlite3.h`、`sqlite3ext.h` 两个头文件。
   2. `C_Project_Runner.linkerLibs` 设置添加 "sqlite3" 选项。
   3. `C_Project_Runner.linkerLibPaths` 设置添加 "dll 文件所在目录"(如 "src/sqlite3") 选项。
   4. 拷贝 `sqlite3.dll` 到可执行文件所在目录。
   5. 编译并运行程序，即可正常使用 sqlite3 库。


### 为程序添加资源文件

#### 可执行文件添加图标

默认包含了源文件 `src/**/*.rc`，所以可以直接在 `src` 目录下添加 `logo.ico` 文件和 `resource.rc` 文件，并在 `resource.rc` 文件中添加以下内容：

```
logo ICON logo.ico
```

编译文件，此时生成的可执行文件图标为 `logo.ico`。
