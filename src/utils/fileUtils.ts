import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { getConfig } from './configUtils';


/**
 * 获取匹配的文件列表（基于项目根目录的相对路径）
 * @returns {Promise<string[]>}
 */
export async function getFiles(): Promise<string[]> {
    const includes: string[] = getConfig('includes', []);
    const excludes: string[] = getConfig('excludes', []);

    let files: string[] = [];

    for (const include of includes) {
        files.push(...((await vscode.workspace.findFiles(include)).map(uri => uri.fsPath)));
    }

    // 修改路径分隔符为 /
    files = files.map(file => file.replaceAll('\\', '/'));

    // 排除文件
    for (const exclude of excludes) {
        // 使 ** 匹配任意字符, * 匹配任意字符但不包括目录
        const regex = exclude
            .replaceAll('\\', '/')
            .replaceAll('.', '\\.')
            .replaceAll('/**/', '#SYMBOL1#')
            .replaceAll('**/', '#SYMBOL1#')
            .replaceAll('/**', '#SYMBOL1#')
            .replaceAll('*', '#SYMBOL2#')
            .replaceAll('#SYMBOL1#', '.*')
            .replaceAll('#SYMBOL2#', '[^/]*');
        const regexPattern = new RegExp(regex);

        files = files.filter(file => !regexPattern.test(file));
    }
    // 转为相对路径
    files = files.map(file => getRelativePath(file));

    return files;
}

/**
 * 将所有路径相加计算绝对路径 (第一个路径固定为工作区路径)
 * @param paths 路径列表
 * @returns 绝对路径
 */
export function getAbsolutePath(...paths: string[]) {
    const workspaceFolder = vscode.workspace.workspaceFolders![0].uri.fsPath;
    return path.resolve(workspaceFolder, ...paths).replaceAll('\\', '/');
}

/**
 * 返回相对于工作区的路径
 * @param filepath 文件路径
 * @returns 相对路径
 */
export function getRelativePath(filepath: string) {
    const workspaceFolder = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const relativePath = path.relative(workspaceFolder, filepath);
    return relativePath.replaceAll('\\', '/');
}

/**
 * 获取文件所在目录
 * @param filepath 文件路径
 * @returns 目录路径
 */
export function getDirname(filepath: string) {
    try {
        return path.dirname(filepath);
    } catch (err) {
        return null;
    }
}

export function pathJoin(...args: string[]) {
    return path.join(...args).replaceAll('\\', '/');
}

/**
 * 判断文件或目录是否存在
 * @param path 路径 (必须为绝对路径)
 * @returns
 */
export function isPathExists(path: string) {
    try {
        fs.accessSync(path, fs.constants.F_OK);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * 若目标文件所在目录不存在，则递归创建目录
 * @param filepath 文件路径 (必须为绝对路径)
 */
export function mkdirRecursive(filepath: string) {
    try {
        const dirname = getDirname(filepath);

        if (dirname && !isPathExists(dirname)) {
            fs.mkdirSync(dirname, { recursive: true });
        }
    } catch (err) {}
}

/**
 * 递归删除文件或目录
 * @param dir 路径 (必须为绝对路径)
 */
export function rmdirRecursive(path: string) {
    try {
        fs.rmSync(path, { recursive: true });
    } catch (err) {}
}


export function readFile(filePath: string) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        return null;
    }
}

export function writeFile(filePath: string, content: string) {
    try {
        mkdirRecursive(filePath);
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    } catch (err) {
        return false;
    }
}
