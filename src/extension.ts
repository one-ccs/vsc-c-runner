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
    isSourceFile,
    isResourceFile,
    getFiles,
    mkdirRecursive,
    pathJoin,
    rmdirRecursive,
    getRelativePath,
    loadRecord,
    dumpRecord,
    analysisFiles,
    isPathExists,
    changeExt,
    getAbsolutePath,
} from './utils/fileUtils';
import { getConfig, getBuildPath } from './utils/configUtils';


let record: {[key: string]: any} | null = null;
let isBuildAndRun: boolean = false;
let showStatusBarButton: boolean = !!getConfig('showStatusBarButton', true);

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

    vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        if (e.affectsConfiguration(`${EXTENSION_NAME}.showStatusBarButton`)) {
            showStatusBarButton = !!getConfig('showStatusBarButton', true);

            updateModeStatus(modeStatusBar, showStatusBarButton, buildMode);
            updateBuildStatus(buildStatusBar, showStatusBarButton);
            updateRunStatus(runStatusBar, showStatusBarButton);
            updateBuildAndRunStatus(buildAndRunStatusBar, showStatusBarButton);
            updateRebuildStatus(rebuildStatusBar, showStatusBarButton);
        }
    });
    vscode.tasks.onDidEndTaskProcess((e: vscode.TaskProcessEndEvent) => {
        if (e.execution.task.name === '编译') {
            if (e.exitCode === 0) {
                if (record) dumpRecord(record);
                isBuildAndRun && runTask();
            } else {
                isBuildAndRun ? showWarning('编译失败，终止运行！') : showWarning('编译失败！');
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
    updateModeStatus(modeStatusBar, showStatusBarButton, buildMode);

    const commandName = `${EXTENSION_NAME}.selectMode`;
    commandModeDisposable = vscode.commands.registerCommand(
        commandName,
        async () => {
            const pickedMode = await modeHandler();

            if (pickedMode) {
                buildMode = pickedMode;

                updateModeStatus(modeStatusBar, showStatusBarButton, buildMode);
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
    updateBuildStatus(buildStatusBar, showStatusBarButton);

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
    updateRunStatus(runStatusBar, showStatusBarButton);

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
    updateBuildAndRunStatus(buildAndRunStatusBar, showStatusBarButton);

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
    updateRebuildStatus(rebuildStatusBar, showStatusBarButton);

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
    record                = loadRecord();
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
    const absBinPath      = pathJoin(buildBinFolder, binName);
    const relBinPath      = getRelativePath(absBinPath);
    const isBinFileExists = isPathExists(absBinPath);
    const files           = await getFiles(includes, excludes);
    const { diffFiles, rebuild, rebuildRes, relink } = analysisFiles(files, record);
    const cmds            = [];  // 编译命令列表
    const objs            = [];  // 目标文件列表

    // 构建编译命令
    for (const file of files) {
        // 源文件
        if (isSourceFile(file)) {
            mkdirRecursive(pathJoin(buildObjFolder, file));

            const absOjbPath = pathJoin(buildObjFolder, changeExt(file, 'o'));
            const relObjPath = getRelativePath(absOjbPath);

            objs.push(relObjPath);
            if (rebuild || diffFiles.includes(file) || !isPathExists(absOjbPath)) {
                const cmd = `${compilerPath} ${compilerOptions.join(' ')} ${buildMode === BuildModes.debug ? '-g' : ''} -c ${file} -o ${relObjPath}`;
                cmds.push(cmd);
            }
        }
        // 资源文件
        if (isResourceFile(file)) {
            mkdirRecursive(pathJoin(buildObjFolder, file));

            const absResPath = pathJoin(buildObjFolder, changeExt(file, 'res'));
            const relResPath = getRelativePath(absResPath);

            objs.push(relResPath);
            if (rebuildRes || diffFiles.includes(file) || !isPathExists(absResPath)) {
                const cmd = `${resCompilerPath} -J rc -O coff -i ${file} -o ${relResPath}`;

                cmds.push(cmd);
            }
        }
    }
    if (!objs.length) {
        showWarning('未找到需要编译的文件, 请检查文件包含规则！');
        vscode.commands.executeCommand('workbench.action.openSettings', `${EXTENSION_NAME}.includes`);
        return;
    }
    if (!cmds.length && !relink && isBinFileExists) {
        isBuildAndRun ? runTask() : showInfo('无需编译。');
        return;
    }

    // 删除可执行文件
    if (isBinFileExists) {
        rmdirRecursive(absBinPath);
    } else {
        mkdirRecursive(absBinPath);
    }

    // 构建链接命令
    let cmd = `${compilerPath} -o ${relBinPath} ${objs.join(' ')}`;

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
        showWarning('未找到可执行文件, 请先编译！');
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
