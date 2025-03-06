import * as vscode from 'vscode';

import {
    EXTENSION_NAME,
} from './params/params';
import {
    BuildModes,
} from './types/enums';
import {
    updateModeStatus,
    updateBuildStatus,
    updateRunStatus,
    updateBuildAndRunStatus,
    updateRebuildStatus,
} from './items/statusBarItems';
import { modeHandler } from './handlers/modeHandler';
import {
    updateActivationState,
    setContextValue,
    createStatusBarItem,
    disposeItem,
    runVscodeTask,
    showInfo,
    showWarning,
} from './utils/vscodeUtils';
import {
    getBuildPath,
    getFiles,
    mkdirRecursive,
    pathJoin,
    rmdirRecursive,
    getRelativePath,
    withNeedCompile,
    isPathExists,
} from './utils/fileUtils';
import { getConfig } from './utils/configUtils';

let isBuildAndRun: boolean = false;
let showStatusBarItems: boolean = true;

let modeStatusBar: vscode.StatusBarItem | undefined;
let buildStatusBar: vscode.StatusBarItem | undefined;
let runStatusBar: vscode.StatusBarItem | undefined;
let buildAndRunStatusBar: vscode.StatusBarItem | undefined;
let rebuildStatusBar: vscode.StatusBarItem | undefined;

let commandModeDisposable: vscode.Disposable | undefined;
let commandBuildDisposable: vscode.Disposable | undefined;
let commandRunDisposable: vscode.Disposable | undefined;
let commandBuildAndRunDisposable: vscode.Disposable | undefined;
let commandRebuildDisposable: vscode.Disposable | undefined;

export let extensionContext: vscode.ExtensionContext | undefined;
export let extensionState: vscode.Memento | undefined;
export let extensionPath: string | undefined;
export let buildMode: BuildModes = BuildModes.release;


export function activate(context: vscode.ExtensionContext) {
    if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0 ||
        !vscode.workspace.workspaceFolders[0] ||
        !vscode.workspace.workspaceFolders[0].uri
    ) {
        return;
    }

    vscode.tasks.onDidEndTaskProcess((e: vscode.TaskProcessEndEvent) => {
        if (e.execution.task.name === '编译') {
            if (e.exitCode === 0) {
                isBuildAndRun && runTask();
            } else {
                showWarning('编译失败');
            }
        }
    });

    extensionContext = context;
    extensionPath = context.extensionPath;
    extensionState = context.workspaceState;

    setContextValue(`${EXTENSION_NAME}:activatedExtension`, true);
    updateActivationState(true);

    initModeStatusBar();
    initBuildStatusBar();
    initRunStatusBar();
    initBuildAndRunStatusBar();
    initRebuildStatusBar();
}

export function deactivate() {
    setContextValue(`${EXTENSION_NAME}:activatedExtension`, false);
    updateActivationState(false);

    disposeItem(commandModeDisposable);
    disposeItem(commandBuildDisposable);
    disposeItem(commandRunDisposable);
    disposeItem(commandBuildAndRunDisposable);
    disposeItem(commandRebuildDisposable);
}

function initModeStatusBar() {
    if (modeStatusBar) return;

    modeStatusBar = createStatusBarItem();
    modeStatusBar.tooltip = '选择编译模式';
    extensionContext?.subscriptions.push(modeStatusBar);
    updateModeStatus(modeStatusBar, showStatusBarItems, buildMode);

    const commandName = `${EXTENSION_NAME}.selectMode`;
    commandModeDisposable = vscode.commands.registerCommand(
        commandName,
        async () => {
            const pickedMode = await modeHandler();

            if (pickedMode) {
                buildMode = pickedMode;

                updateModeStatus(modeStatusBar, showStatusBarItems, buildMode);
            }
        },
    );

    modeStatusBar.command = commandName;
    extensionContext?.subscriptions.push(commandModeDisposable);
}

function initBuildStatusBar() {
    if (buildStatusBar) return;

    buildStatusBar = createStatusBarItem();
    buildStatusBar.tooltip = '编译';
    extensionContext?.subscriptions.push(buildStatusBar);
    updateBuildStatus(buildStatusBar, showStatusBarItems);

    const commandName = `${EXTENSION_NAME}.build`;
    commandBuildDisposable = vscode.commands.registerCommand(
        commandName,
        async () => {
            buildTask();
        },
    );

    buildStatusBar.command = commandName;
    extensionContext?.subscriptions.push(commandBuildDisposable);
}

function initRunStatusBar() {
    if (runStatusBar) return;

    runStatusBar = createStatusBarItem();
    runStatusBar.tooltip = '运行';
    extensionContext?.subscriptions.push(runStatusBar);
    updateRunStatus(runStatusBar, showStatusBarItems);

    const commandName = `${EXTENSION_NAME}.run`;
    commandRunDisposable = vscode.commands.registerCommand(
        commandName,
        async () => {
            runTask();
        }
    );

    runStatusBar.command = commandName;
    extensionContext?.subscriptions.push(commandRunDisposable);
}

function initBuildAndRunStatusBar() {
    if (buildAndRunStatusBar) return;

    buildAndRunStatusBar = createStatusBarItem();
    buildAndRunStatusBar.tooltip = '编译并运行';
    extensionContext?.subscriptions.push(buildAndRunStatusBar);
    updateBuildAndRunStatus(buildAndRunStatusBar, showStatusBarItems);

    const commandName = `${EXTENSION_NAME}.buildAndRun`;
    commandBuildAndRunDisposable = vscode.commands.registerCommand(
        commandName,
        async () => {
            buildAndRunTask();
        }
    );

    buildAndRunStatusBar.command = commandName;
    extensionContext?.subscriptions.push(commandBuildAndRunDisposable);
}

function initRebuildStatusBar() {
    if (rebuildStatusBar) return;

    rebuildStatusBar = createStatusBarItem();
    rebuildStatusBar.tooltip = '重新生成';
    extensionContext?.subscriptions.push(rebuildStatusBar);
    updateRebuildStatus(rebuildStatusBar, showStatusBarItems);

    const commandName = `${EXTENSION_NAME}.rebuild`;
    commandRebuildDisposable = vscode.commands.registerCommand(
        commandName,
        async () => {
            vscode.window.showWarningMessage('重新生成将会删除之前的编译结果并重新构建，这个动作可能会持续较长时间，是否继续？', '继续', '取消').then(async (result) => {
                if (result === '继续') {
                    rebuildTask();
                }
            });
        }
    );

    rebuildStatusBar.command = commandName;
    extensionContext?.subscriptions.push(commandRebuildDisposable);
}

async function buildTask() {
    const includes        = getConfig('includes', []) as string[];
    const excludes        = getConfig('excludes', []) as string[];
    const buildPath       = getBuildPath();
    const buildObjFolder  = pathJoin(buildPath, buildMode, 'obj');
    const buildBinFolder  = pathJoin(buildPath, buildMode, 'bin');
    const resCompilerPath = getConfig('resCompilerPath', 'windres') as string;
    const compilerPath    = getConfig('compilerPath', 'gcc') as string;
    const compilerOptions = getConfig('compilerOptions', []) as string[];
    const linkerOptions   = getConfig('linkerOptions', []) as string[];
    const linkerLibs      = getConfig('linkerLibs', []) as string[];
    const linkerLibPaths  = getConfig('linkerLibPaths', []) as string[];
    const binName         = `${vscode.workspace.name}.exe`;

    const cmds = [];
    const objs = [];
    const files = await getFiles(includes, excludes);
    const needCompileFiles = withNeedCompile(files);

    for (const file of files) {
        // 创建目录
        mkdirRecursive(pathJoin(buildObjFolder, file));

        // 编译源文件
        if (file.endsWith('.c')) {
            const objPath = getRelativePath(pathJoin(buildObjFolder, file.replace('.c', '.o')));
            let cmd = compilerPath;

            cmd += ' ';
            cmd += compilerOptions.join(' ');
            cmd += ' ';
            cmd += (buildMode === BuildModes.debug ? '-g' : '');
            cmd += ' ';
            cmd += `-c ${file}`;
            cmd += ' ';
            cmd += `-o ${(objPath)}`;

            needCompileFiles.includes(file) && cmds.push(cmd);
            objs.push(objPath);
        }
        // 编译资源文件
        if (file.endsWith('.rc')) {
            const resPath = getRelativePath(pathJoin(buildObjFolder, file.replace('.rc', '.res')));
            let cmd = resCompilerPath;

            cmd += ' -J rc -O coff ';
            cmd += `-i ${file}`;
            cmd += ' ';
            cmd += `-o ${resPath}`;

            needCompileFiles.includes(file) && cmds.push(cmd);
            objs.push(resPath);
        }
    }
    if (!objs.length) {
        showWarning('未找到需要编译的文件, 请检查文件包含规则。');
        vscode.commands.executeCommand('workbench.action.openSettings', `${EXTENSION_NAME}.includes`);
    }

    // 链接文件并生成可执行文件
    const absBinPath = pathJoin(buildBinFolder, binName);
    const relBinPath = getRelativePath(absBinPath);

    if (!needCompileFiles.length && isPathExists(absBinPath)) {
        isBuildAndRun ? runTask() : showInfo('无需编译');
        return;
    }

    if (isPathExists(pathJoin(buildBinFolder, binName))) {
        rmdirRecursive(absBinPath);
    }
    else {
        mkdirRecursive(absBinPath);
    }

    let cmd = compilerPath;

    cmd += ' ';
    cmd += `-o ${relBinPath}`;
    cmd += ' ';
    cmd += objs.join(' ');
    if (linkerLibPaths.length) {
        cmd += ' ';
        cmd += linkerLibPaths.map(path => `-L${path}`).join(' ');
    }
    if (linkerLibs.length) {
        cmd += ' ';
        cmd += linkerLibs.map(lib => `-l${lib}`).join(' ');
    }
    if (linkerOptions.length) {
        cmd += ' ';
        cmd += linkerOptions.join(' ');
    }

    cmds.push(cmd);

    runVscodeTask('编译', cmds.join(' && '));
}

async function runTask() {
    isBuildAndRun = false;

    const buildPath      = getBuildPath();
    const buildBinFolder = pathJoin(buildPath, buildMode, 'bin');
    const runArgs        = getConfig('runArgs', []) as string[];
    const binName        = `${vscode.workspace.name}.exe`;

    if (!isPathExists(pathJoin(buildBinFolder, binName))) {
        showWarning('未找到可执行文件, 请先编译。');
        return;
    }

    const cmd = `cd /d ${getRelativePath(buildBinFolder)} && start ${binName} ${runArgs.join(' ')}`;

    runVscodeTask('运行', cmd);
}

async function buildAndRunTask() {
    isBuildAndRun = true;

    buildTask();
}

async function rebuildTask() {
    const buildPath = getBuildPath();

    rmdirRecursive(buildPath);

    buildAndRunTask();
}
