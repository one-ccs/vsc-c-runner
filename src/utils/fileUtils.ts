import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as vscode from 'vscode';

import { getConfig } from './configUtils';
import { showWarning } from './vscodeUtils';
import { BuildModes } from '../types/enums';
import { buildMode } from '../extension';
import { FILE_ENCODING, RECORD_FILE_NAME } from '../params/params';


/**
 * 获取匹配的文件列表（基于项目根目录的相对路径）
 * @param includes 文件包含规则
 * @param excludes 文件排除规则
 * @returns {Promise<string[]>}
 */
export async function getFiles(includes: string[], excludes: string[]): Promise<string[]> {
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

export function getBuildPath() {
    return getAbsolutePath(getConfig('buildPath', '.build'));
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

/**
 * 计算文件 md5 值
 * @param filePath 文件路径
 * @returns md5
 */
function getFileMd5(filePath: string): string {
    const buffer = fs.readFileSync(getAbsolutePath(filePath), { encoding: FILE_ENCODING, flag: 'r' }).trim();
    const md5 = crypto.createHash('md5').update(buffer).digest('hex');
    return md5;
}

export function loadRecord(): {[key: string]: any} {
    const recordPath = pathJoin(getBuildPath(), RECORD_FILE_NAME);

    try {
        const text = fs.readFileSync(recordPath, { encoding: FILE_ENCODING, flag: 'r' }) || '{}';
        return JSON.parse(text);
    } catch (err) {
        return {};
    }
}

export function dumpRecord(record: {}) {
    const recordPath = pathJoin(getBuildPath(), RECORD_FILE_NAME);

    mkdirRecursive(recordPath);
    try {
        const text = JSON.stringify(record);
        fs.writeFileSync(recordPath, text, { encoding: FILE_ENCODING, flag: 'w' });
    } catch (err) {
        showWarning('编译记录保存失败。');
    }
}

export function withNeedCompile(filePaths: string[]): string[] {
    const files: string[] = [];
    // 读取编译记录
    const record = loadRecord();

    if (!record.hasOwnProperty(BuildModes.debug)) {
        record[BuildModes.debug] = {};
    }
    if (!record.hasOwnProperty(BuildModes.release)) {
        record[BuildModes.release] = {};
    }

    // 若记录不存在, 或文件 md5 值不同, 则需要编译
    for (const filePath of filePaths) {
        const md5 = getFileMd5(filePath);

        if (record[buildMode][filePath] !== md5) {
            files.push(filePath);
            record[buildMode][filePath] = md5;
        }
    }

    // 更新编译记录
    dumpRecord(record);

    return files;
}
