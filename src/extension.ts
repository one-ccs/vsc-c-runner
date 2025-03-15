import * as vscode from 'vscode';

import {
    CHANGE_ENCODING_MODE_ITEMS,
    EXTENSION_NAME,
    VSCODE_ENCODING_ITEMS,
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
    copyDir,
    transcodingFile,
} from './utils/fileUtils';
import { getConfig, getBuildPath } from './utils/configUtils';


let record: {[key: string]: any} | null = null;
let isBuildAndRun: boolean = false;
let StatusBarButtonShown: boolean = !!getConfig('StatusBarButtonShown', true);

let modeStatusBar: vscode.StatusBarItem | undefined;
let buildStatusBar: vscode.StatusBarItem | undefined;
let runStatusBar: vscode.StatusBarItem | undefined;
let buildAndRunStatusBar: vscode.StatusBarItem | undefined;
let rebuildStatusBar: vscode.StatusBarItem | undefined;

let commandChangeEncodingDisposable: vscode.Disposable | undefined;
let commandModeDisposable: vscode.Disposable | undefined;
let commandBuildDisposable: vscode.Disposable | undefined;
let commandRunDisposable: vscode.Disposable | undefined;
let commandBuildAndRunDisposable: vscode.Disposable | undefined;
let commandRebuildDisposable: vscode.Disposable | undefined;

export let outputChannel: vscode.OutputChannel | undefined;
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
    outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);

    vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        if (e.affectsConfiguration(`${EXTENSION_NAME}.StatusBarButtonShown`)) {
            StatusBarButtonShown = !!getConfig('StatusBarButtonShown', true);

            updateModeStatus(modeStatusBar, StatusBarButtonShown, buildMode);
            updateBuildStatus(buildStatusBar, StatusBarButtonShown);
            updateRunStatus(runStatusBar, StatusBarButtonShown);
            updateBuildAndRunStatus(buildAndRunStatusBar, StatusBarButtonShown);
            updateRebuildStatus(rebuildStatusBar, StatusBarButtonShown);
        }
        if (
            e.affectsConfiguration(`${EXTENSION_NAME}.StatusBarButtonAlign`) ||
            e.affectsConfiguration(`${EXTENSION_NAME}.StatusBarButtonPriority`)
        ) {
            vscode.window.showInformationMessage('已修改状态栏样式，是否立即重启 VSCode 使样式生效？', '是', '否').then(async (result) => {
                if (result === '是') {
                    await vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
    });
    vscode.tasks.onDidEndTaskProcess((e: vscode.TaskProcessEndEvent) => {
        if (e.execution.task.name === '编译') {
            if (e.exitCode === 0) {
                const publics        = getConfig('publics', []) as string[];
                const buildPath      = getBuildPath();
                const buildBinFolder = pathJoin(buildPath, buildMode, 'bin');

                // 拷贝公共文件
                for (const _public of publics) {
                    copyDir(getAbsolutePath(_public), buildBinFolder);
                }
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

function initChangeEncoding() {
    if (commandChangeEncodingDisposable) return;

    const commandName   = `${EXTENSION_NAME}.changeEncoding`;

    commandChangeEncodingDisposable = vscode.commands.registerCommand(
        commandName,
        async () => {
            const includes      = getConfig('includes', []) as string[];
            const excludes      = getConfig('excludes', []) as string[];
            const files         = await getFiles(includes, excludes);

            if (!files.length) {
                return showWarning('未找到待转换编码文件，请检查配置项 "includes" 和 "excludes"。');
            }
            const targetMode  = await vscode.window.showQuickPick(CHANGE_ENCODING_MODE_ITEMS, {
                title: '批量转换文件编码 (1/4)',
                placeHolder: '请选择转换模式',
            });
            if (!targetMode) return;

            const originEncoding = (targetMode.value === 'given'
                ? await vscode.window.showQuickPick(VSCODE_ENCODING_ITEMS, {
                    title: '批量转换文件编码 (2/4)',
                    placeHolder: '请选择源编码',
                })
                : undefined);
            const targetEncoding = await vscode.window.showQuickPick(VSCODE_ENCODING_ITEMS, {
                title: '批量转换文件编码 (3/4)',
                placeHolder: '请选择目标编码',
            });
            if (!targetEncoding) return;

            const targetFiles = await vscode.window.showQuickPick(files, {
                title: '批量转换文件编码 (4/4)',
                placeHolder: '请选择需要转换编码的文件',
                canPickMany: true,
            });
            if (!targetFiles?.length) return;

            for (const file of targetFiles) {
                const absFilePath = getAbsolutePath(file);

                transcodingFile(absFilePath, targetEncoding.value, originEncoding?.value);
            }
        },
    );

    extensionContext?.subscriptions.push(commandChangeEncodingDisposable);
}

function initModeStatusBar() {
    if (modeStatusBar) return;

    const commandName = `${EXTENSION_NAME}.selectMode`;

    modeStatusBar = createStatusBarItem();
    modeStatusBar.tooltip = '选择编译模式';
    modeStatusBar.command = commandName;
    updateModeStatus(modeStatusBar, StatusBarButtonShown, buildMode);

    commandModeDisposable = vscode.commands.registerCommand(
        commandName,
        async () => {
            const pickedMode = await modeHandler();

            if (pickedMode) {
                buildMode = pickedMode;

                updateModeStatus(modeStatusBar, StatusBarButtonShown, buildMode);
            }
        },
    );

    extensionContext?.subscriptions.push(modeStatusBar);
    extensionContext?.subscriptions.push(commandModeDisposable);
}

function initBuildStatusBar() {
    if (buildStatusBar) return;

    const commandName = `${EXTENSION_NAME}.build`;

    buildStatusBar = createStatusBarItem();
    buildStatusBar.tooltip = '编译';
    buildStatusBar.command = commandName;
    updateBuildStatus(buildStatusBar, StatusBarButtonShown);

    commandBuildDisposable = vscode.commands.registerCommand(
        commandName,
        async () => {
            buildTask();
        },
    );

    extensionContext?.subscriptions.push(buildStatusBar);
    extensionContext?.subscriptions.push(commandBuildDisposable);
}

function initRunStatusBar() {
    if (runStatusBar) return;

    const commandName = `${EXTENSION_NAME}.run`;

    runStatusBar = createStatusBarItem();
    runStatusBar.tooltip = '运行';
    runStatusBar.command = commandName;
    updateRunStatus(runStatusBar, StatusBarButtonShown);

    commandRunDisposable = vscode.commands.registerCommand(
        commandName,
        async () => {
            runTask();
        }
    );

    extensionContext?.subscriptions.push(runStatusBar);
    extensionContext?.subscriptions.push(commandRunDisposable);
}

function initBuildAndRunStatusBar() {
    if (buildAndRunStatusBar) return;

    const commandName = `${EXTENSION_NAME}.buildAndRun`;

    buildAndRunStatusBar = createStatusBarItem();
    buildAndRunStatusBar.tooltip = '编译并运行';
    buildAndRunStatusBar.command = commandName;
    updateBuildAndRunStatus(buildAndRunStatusBar, StatusBarButtonShown);

    commandBuildAndRunDisposable = vscode.commands.registerCommand(
        commandName,
        async () => {
            buildAndRunTask();
        }
    );

    extensionContext?.subscriptions.push(buildAndRunStatusBar);
    extensionContext?.subscriptions.push(commandBuildAndRunDisposable);
}

function initRebuildStatusBar() {
    if (rebuildStatusBar) return;

    const commandName = `${EXTENSION_NAME}.rebuild`;

    rebuildStatusBar = createStatusBarItem();
    rebuildStatusBar.tooltip = '重新生成';
    rebuildStatusBar.command = commandName;
    updateRebuildStatus(rebuildStatusBar, StatusBarButtonShown);

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

    extensionContext?.subscriptions.push(rebuildStatusBar);
    extensionContext?.subscriptions.push(commandRebuildDisposable);
}

async function buildTask() {
    // 触发工作区保存
    await vscode.commands.executeCommand('workbench.action.files.saveAll');
    record                   = loadRecord();
    const includes           = getConfig('includes', []) as string[];
    const excludes           = getConfig('excludes', []) as string[];
    const buildPath          = getBuildPath();
    const buildObjFolder     = pathJoin(buildPath, buildMode, 'obj');
    const buildBinFolder     = pathJoin(buildPath, buildMode, 'bin');
    const resCompilerPath    = getConfig('resCompilerPath', 'windres') as string;
    const resCompilerOptions = getConfig('resCompilerOptions', []) as string[];
    const compilerPath       = getConfig('compilerPath', 'gcc') as string;
    const compilerOptions    = getConfig('compilerOptions', []) as string[];
    const linkerPath         = getConfig('linkerPath', 'gcc') as string;
    const linkerOptions      = getConfig('linkerOptions', []) as string[];
    const linkerLibs         = getConfig('linkerLibs', []) as string[];
    const linkerLibPaths     = getConfig('linkerLibPaths', []) as string[];
    const binName            = `${vscode.workspace.name}.exe`;
    const absBinPath         = pathJoin(buildBinFolder, binName);
    const relBinPath         = getRelativePath(absBinPath);
    const isBinFileExists    = isPathExists(absBinPath);
    const files              = await getFiles(includes, excludes);
    const { diffFiles, rebuild, rebuildRes, relink } = analysisFiles(files, record);
    const cmds               = [];  // 编译命令列表
    const objs               = [];  // 目标文件列表

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
                const cmd = `${resCompilerPath} ${resCompilerOptions.join(' ')} ${file} -o ${relResPath}`;

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
    let cmd = `${linkerPath} -o ${relBinPath} ${objs.join(' ')}`;

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


initChangeEncoding();
