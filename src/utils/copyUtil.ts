/**
 * 深拷贝对象
 * @param obj 对象
 * @returns 拷贝后的对象
 */
export function deepCopy(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    let copy: any = Array.isArray(obj) ? [] : {};
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            copy[key] = deepCopy(obj[key]);
        }
    }
    return copy;
}
