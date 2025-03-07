import * as vscode from 'vscode';

import { EXTENSION_NAME } from '../params/params';
import { md5, getAbsolutePath } from './fileUtils';


/**
 * 计算当前配置项的唯一标识
 * @returns 配置项标识
 */
export function getConfigIds() {
    const buildOption    = ['buildPath', 'compilerPath', 'compilerOptions',];
    const buildResOption = ['resCompilerPath',];
    const linkOption     = ['linkerOptions', 'linkerLibs', 'linkerLibPaths'];
    const config = vscode.workspace.getConfiguration(EXTENSION_NAME);

    return {
        __buildId: md5(JSON.stringify(config, buildOption)),
        __buildResId: md5(JSON.stringify(config, buildResOption)),
        __linkId: md5(JSON.stringify(config, linkOption)),
    }
}

/**
 * 获取插件配置
 * @param key 配置项
 * @param defaultValue 默认值
 * @returns 配置值
 */
export function getConfig(key: string, defaultValue: any = null) {
    return vscode.workspace.getConfiguration(EXTENSION_NAME).get(key, defaultValue);
}

/**
 * 获取配置的编译路径（绝对路径）
 * @returns 编译路径
 */
export function getBuildPath() {
    return getAbsolutePath(getConfig('buildPath', '.build'));
}
