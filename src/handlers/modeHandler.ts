import * as vscode from 'vscode';

import { BuildModes } from '../types/enums';


export async function modeHandler() {
    const combinations = [BuildModes.debug, BuildModes.release];

    const pickedCombination = await vscode.window.showQuickPick(combinations, {
        placeHolder: '请选择编译模式',
    });

    if (!pickedCombination) return undefined;

    const pickedMode = pickedCombination.includes(BuildModes.debug)
        ? BuildModes.debug
        : BuildModes.release;

    return pickedMode;
}
