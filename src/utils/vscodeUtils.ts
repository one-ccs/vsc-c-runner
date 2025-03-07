import { platform } from 'os';
import * as vscode from 'vscode';

import { extensionState } from '../extension';
import {
    EXTENSION_NAME,
} from '../params/params';
import { getConfig } from './configUtils';


export function showInfo(msg: string): void {
    vscode.window.showInformationMessage(msg);
}

export function showWarning(msg: string): void {
    vscode.window.showWarningMessage(msg);
}

export function updateActivationState(newState: boolean) {
    extensionState?.update('activatedExtension', newState);
}

export function setContextValue(key: string, value: any) {
    return vscode.commands.executeCommand('setContext', key, value);
}

export function createStatusBarItem() {
    return vscode.window.createStatusBarItem(
        getConfig('StatusBarButtonAlign', 'left') === 'left' ? vscode.StatusBarAlignment.Left : vscode.StatusBarAlignment.Right,
        getConfig('StatusBarButtonPriority', 50),
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
