import * as vscode from 'vscode';
import { EXTENSION_NAME } from '../params/params';


export function getConfig(key: string, defaultValue: any = null) {
    return vscode.workspace.getConfiguration(EXTENSION_NAME).get(key) || defaultValue;
}
