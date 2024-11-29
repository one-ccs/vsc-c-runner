import { platform } from 'os';
import * as vscode from 'vscode';

import { extensionState } from '../extension';
import {
    EXTENSION_NAME,
    STATUS_BAR_ALIGN,
    STATUS_BAR_PRIORITY,
} from '../params/params';


export function showInfo(msg: string): void {
    vscode.window.showInformationMessage(msg);
}

export function updateActivationState(newState: boolean) {
    extensionState?.update('activatedExtension', newState);
}

export function setContextValue(key: string, value: any) {
    return vscode.commands.executeCommand('setContext', key, value);
}

export function createStatusBarItem() {
    return vscode.window.createStatusBarItem(
        STATUS_BAR_ALIGN,
        STATUS_BAR_PRIORITY,
    );
}

export function disposeItem(disposableItem: vscode.Disposable | undefined) {
    disposableItem?.dispose();
}

export function runVscodeTask(taskName: string, command: string, problemMatcher: string[] = ['$gcc']) {
    const definition = {
        type: 'shell',
        task: taskName,
    };
    const execution = getExecution(command);
    const task = new vscode.Task(
        definition,
        vscode.TaskScope.Workspace,
        taskName,
        EXTENSION_NAME,
        execution,
        problemMatcher,
    );

    return vscode.tasks.executeTask(task);
}

function getExecution(command: string): vscode.ShellExecution | undefined {
    if (platform() === 'win32') {
        return new vscode.ShellExecution(command);
    }
    return undefined;
}
