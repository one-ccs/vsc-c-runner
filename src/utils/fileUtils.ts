import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as chardet from 'chardet';
import * as iconv from 'iconv-lite';
import * as vscode from 'vscode';

import { getConfigIds, getBuildPath } from './configUtils';
import { BuildModes } from '../types/enums';
import { buildMode, outputChannel } from '../extension';
import { S_H_MAP, EXT_RESOURCE, EXT_SOURCE, FILE_ENCODING, RECORD_FILE_NAME, EXT_HEADER } from '../params/params';
import { deepCopy } from './copyUtil';


/**
 * 计算数据的 md5 值
 * @param data 数据
 * @returns md5
 */
export function md5(data: crypto.BinaryLike): string {
    return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * 判断是否为头文件
 * @param path 文件路径
 * @returns bool
 */
export function isHeaderFile(path: string) {
    return EXT_HEADER.some(ext => path.endsWith(ext));
}

/**
 * 判断是否为源文件
 * @param path 文件路径
 * @returns bool
 */
export function isSourceFile(path: string) {
    return EXT_SOURCE.some(ext => path.endsWith(ext));
}

/**
 * 判断是否为资源文件
 * @param path 文件路径
 * @returns bool
 */
export function isResourceFile(path: string) {
    return EXT_RESOURCE.some(ext => path.endsWith(ext));
}

/**
 * 转换文件编码
 * @param filePath 文件路径
 * @param targetEncoding 目标编码
 * @param originEncoding 原始编码
 */
export async function transcodingFile(filePath: string, targetEncoding: string, originEncoding?: string) {
    if (!isPathExists(filePath)) return;

    originEncoding = originEncoding || await chardet.detectFile(filePath) as string;

    if (!originEncoding) return outputChannel?.appendLine(`转换文件编码失败，无法识别文件编码: "${filePath}"`);
    if (originEncoding.replace('-', '').toLowerCase() === targetEncoding.replace('-', '').toLowerCase()) return;

    try {
        const uri = vscode.Uri.file(filePath);
        const originBuffer = Buffer.from(await vscode.workspace.fs.readFile(uri));
        const originString = iconv.decode(originBuffer, originEncoding);
        const targetBuffer = iconv.encode(originString, targetEncoding);

        await vscode.workspace.fs.writeFile(uri, targetBuffer);

        outputChannel?.appendLine(`转换文件编码成功: "${filePath}" "${originEncoding}" -> "${targetEncoding}"`);
    } catch (err) {
        outputChannel?.appendLine(`转换文件编码成功: "${filePath}" "${originEncoding}" -> "${targetEncoding}"`);
    }
}

/**
 * 获取文件扩展名
 * @param path 文件路径
 * @returns 文件扩展名 (不含 "."), 未知则返回空字符串
 */
export function getExt(path: string): string {
    const parts = path.split('.');

    if (parts.length > 1) {
        return parts[parts.length - 1];
    }
    return '';
}

/**
 * 修改文件路径中的扩展名
 * @param path 文件路径
 * @param ext 扩展名（不含 "."）
 * @returns 修改后的路径
 */
export function changeExt(path: string, ext: string) {
    const parts = path.split('.');

    if (parts.length > 1) {
        parts[parts.length - 1] = ext;
    } else {
        parts.push(ext);
    }

    return parts.join('.');
}

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

/**
 * 路径拼接
 * @param args 路径列表
 * @returns 拼接后的路径
 */
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
    } catch (err) {
        outputChannel?.appendLine(`创建目录失败: ${filepath}`);
        console.warn('创建目录失败: ', err);
    }
}

/**
 * 递归删除文件或目录
 * @param path 路径 (必须为绝对路径)
 */
export function rmdirRecursive(path: string) {
    try {
        fs.rmSync(path, { recursive: true });
    } catch (err) {
        outputChannel?.appendLine(`删除文件或目录失败: ${path}`);
        console.warn('删除文件或目录失败: ', err);
    }
}

/**
 * 复制源目录的所有文件或目录到目标目录
 * @param srcDir 源目录
 * @param destDir 目标目录
 * @returns 是否成功
 */
export function copyDir(srcDir: string, destDir: string) {
    if (!isPathExists(srcDir)) return;

    try {
        fs.mkdirSync(destDir, { recursive: true });
        const files = fs.readdirSync(srcDir, { withFileTypes: true });

        for (const file of files) {
            const srcPath = path.join(srcDir, file.name);
            const destPath = path.join(destDir, file.name);

            if (file.isDirectory()) {
                copyDir(srcPath, destPath);
            } else {
                if (isPathExists(destPath)) continue;
                fs.copyFileSync(srcPath, destPath);
                outputChannel?.appendLine(`复制文件: ${srcPath} -> ${destPath}`);
            }
        }
    } catch (err) {
        outputChannel?.appendLine(`复制目录失败: ${srcDir} -> ${destDir}`);
        console.warn('复制目录失败: ', err);
    }
}


/**
 * 计算文件 md5 值
 * @param filePath 文件绝对路径
 * @returns md5
 */
function getFileMd5(filePath: string): string {
    const buffer = fs.readFileSync(filePath, { encoding: FILE_ENCODING, flag: 'r' }).trim();
    return md5(buffer);
}

/**
 * 加载编译记录
 * @returns 编译记录
 */
export function loadRecord(): {[key: string]: any} {
    const recordPath = pathJoin(getBuildPath(), RECORD_FILE_NAME);

    try {
        const text = fs.readFileSync(recordPath, { encoding: FILE_ENCODING, flag: 'r' }) || '{}';
        return JSON.parse(text);
    } catch (err) {
        return {};
    }
}

/**
 * 保存编译记录
 * @param record 编译记录
 */
export function dumpRecord(record: {}) {
    const recordPath = pathJoin(getBuildPath(), RECORD_FILE_NAME);

    mkdirRecursive(recordPath);
    try {
        const text = JSON.stringify(record);
        fs.writeFileSync(recordPath, text, { encoding: FILE_ENCODING, flag: 'w' });
    } catch (err) {
        outputChannel?.appendLine('编译记录保存失败。');
    }
}

/**
 * 分析文件是否需要重新编译，同时修改记录
 * @param files 文件路径列表
 * @returns 分析结果
 */
export function analysisFiles(files: string[], record: {[key: string]: any}): {
    diffFiles: string[],
    rebuild: boolean,
    rebuildRes: boolean,
    relink: boolean,
} {
    if (!record.hasOwnProperty(BuildModes.debug)) record[BuildModes.debug] = {};
    if (!record.hasOwnProperty(BuildModes.release)) record[BuildModes.release] = {};

    const oldRecord = deepCopy(record);
    const diffFiles: string[] = [];

    record[buildMode] = {
        ...getConfigIds(),
    };
    // 若记录不存在, 或文件 md5 值不同，或编译配置变化, 则需要编译
    for (const file of files) {
        const md5 = getFileMd5(getAbsolutePath(file));

        record[buildMode][file] = md5;
        if (oldRecord[buildMode][file] !== md5) diffFiles.push(file);

        if (isSourceFile(file)) {
            const headerFile = changeExt(file, S_H_MAP[getExt(file)]);
            const absHeaderFile = getAbsolutePath(headerFile);

            if (isPathExists(absHeaderFile)) {
                const headerMd5 = getFileMd5(absHeaderFile);

                record[buildMode][headerFile] = headerMd5;
                if (oldRecord[buildMode][headerFile] !== headerMd5) diffFiles.push(headerFile);
            }
        }
    }
    // lib 头文件更新，重新编译所有 lib 文件
    if (diffFiles.some(file => isHeaderFile(file) && file.startsWith('lib/'))) {
        diffFiles.push(...files.filter(file => !diffFiles.includes(file) && isSourceFile(file) && file.startsWith('lib/')));
    }
    // 其它头文件更新，重新编译除 lib 文件外的所有文件
    if (diffFiles.some(file => isHeaderFile(file) && !file.startsWith('lib/'))) {
        diffFiles.push(...files.filter(file => !diffFiles.includes(file) && isSourceFile(file) && !file.startsWith('lib/')));
    }

    // 添加文件（已在编译列表，会自动链接），减少文件需要强制重新链接
    const oldFiles = Object.keys(oldRecord[buildMode]).filter(key => !key.startsWith('__'));
    const newFiles = Object.keys(record[buildMode]).filter(key => !key.startsWith('__'));

    return {
        diffFiles,
        rebuild: (oldRecord[buildMode]['__buildId'] != record[buildMode]['__buildId']),
        rebuildRes: (oldRecord[buildMode]['__buildResId'] != record[buildMode]['__buildResId']),
        relink: (oldRecord[buildMode]['__linkId'] != record[buildMode]['__linkId']) || (oldFiles.length !== newFiles.length),
    }
}
