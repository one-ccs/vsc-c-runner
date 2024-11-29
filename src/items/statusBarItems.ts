import * as vscode from 'vscode';

import { BuildModes } from '../types/enums';


export function updateModeStatus(
    status: vscode.StatusBarItem | undefined,
    display: boolean,
    buildMode: BuildModes,
) {
    toggleStatusDisplay(status, display, `$(tools) ${buildMode}`);
}

export function updateBuildStatus(
    status: vscode.StatusBarItem | undefined,
    display: boolean,
) {
    toggleStatusDisplay(status, display, `$(gear)`);
}

export function updateRunStatus(
    status: vscode.StatusBarItem | undefined,
    display: boolean,
) {
    toggleStatusDisplay(status, display, `$(play)`);
}

export function updateBuildAndRunStatus(
    status: vscode.StatusBarItem | undefined,
    display: boolean,
) {
    toggleStatusDisplay(status, display, `$(zap)`);
}

export function updateRebuildStatus(
    status: vscode.StatusBarItem | undefined,
    display: boolean,
) {
    toggleStatusDisplay(status, display, `$(refresh)`);
}

function toggleStatusDisplay(
    status: vscode.StatusBarItem | undefined,
    display: boolean,
    text: string,
) {
    if (!status) return;

    status.text = text;
    display ? status.show() : status.hide();
}
