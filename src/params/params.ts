export const EXTENSION_NAME      = 'C_Project_Runner';
export const RECORD_FILE_NAME    = '.record';
export const FILE_ENCODING       = 'utf8';
export const EXT_SOURCE          = ['.c', '.cpp'];
export const EXT_HEADER          = ['.h', '.hpp'];
export const EXT_RESOURCE        = ['.rc'];
export const S_H_MAP: { [key: string]: string } = { c: 'h', cpp: 'hpp' };

export const CHANGE_ENCODING_MODE_ITEMS = [
    { label: '自动检测 => 指定类型', value: 'auto' },
    { label: '指定类型 => 指定类型', value: 'given' },
];
export const VSCODE_ENCODING_ITEMS = [
    { label: "UTF-8", value: "utf8", description: "utf8" },
    { label: "UTF-16 LE", value: "utf16le", description: "utf16le" },
    { label: "UTF-16 BE", value: "utf16be", description: "utf16be" },
    { label: "Simplified Chinese (GB18030)", value: "gb18030", description: "gb18030" },
    { label: "Simplified Chinese (GB2312)", value: "gb2312", description: "gb2312" },
    { label: "Simplified Chinese (GBK)", value: "gbk", description: "gbk" },
    { label: "Traditional Chinese (Big5-HKSCS)", value: "big5hkscs", description: "big5hkscs" },
    { label: "Traditional Chinese (Big5)", value: "cp950", description: "cp950" },

    { label: "Arabic (ISO 8859-6)", value: "iso88596", description: "iso88596" },
    { label: "Arabic (Windows 1256)", value: "windows1256", description: "windows1256" },
    { label: "Baltic (ISO 8859-4)", value: "iso88594", description: "iso88594" },
    { label: "Baltic (Windows 1257)", value: "windows1257", description: "windows1257" },
    { label: "Celtic (ISO 8859-14)", value: "iso885914", description: "iso885914" },
    { label: "Central European (CP 852)", value: "cp852", description: "cp852" },
    { label: "Central European (ISO 8859-2)", value: "iso88592", description: "iso88592" },
    { label: "Central European (Windows 1250)", value: "windows1250", description: "windows1250" },
    { label: "Cyrillic (CP 1125)", value: "cp1125", description: "cp1125" },
    { label: "Cyrillic (CP 866)", value: "cp866", description: "cp866" },
    { label: "Cyrillic (ISO 8859-5)", value: "iso88595", description: "iso88595" },
    { label: "Cyrillic (KOI8-R)", value: "koi8r", description: "koi8r" },
    { label: "Cyrillic (KOI8-RU)", value: "koi8ru", description: "koi8ru" },
    { label: "Cyrillic (KOI8-U)", value: "koi8u", description: "koi8u" },
    { label: "Cyrillic (Windows 1251)", value: "windows1251", description: "windows1251" },
    { label: "DOS (CP 437)", value: "cp437", description: "cp437" },
    { label: "Estonian (ISO 8859-13)", value: "iso885913", description: "iso885913" },
    { label: "Greek (ISO 8859-7)", value: "iso88597", description: "iso88597" },
    { label: "Greek (Windows 1253)", value: "windows1253", description: "windows1253" },
    { label: "Hebrew (ISO 8859-8)", value: "iso88598", description: "iso88598" },
    { label: "Hebrew (Windows 1255)", value: "windows1255", description: "windows1255" },
    { label: "Japanese (EUC-JP)", value: "eucjp", description: "eucjp" },
    { label: "Japanese (Shift JIS)", value: "shiftjis", description: "shiftjis" },
    { label: "Korean (EUC-KR)", value: "euckr", description: "euckr" },
    { label: "Latin/Thai (ISO 8859-11)", value: "iso885911", description: "iso885911" },
    { label: "Mac Roman", value: "macroman", description: "macroman" },
    { label: "Nordic (ISO 8859-10)", value: "iso885910", description: "iso885910" },
    { label: "Nordic DOS (CP 865)", value: "cp865", description: "cp865" },
    { label: "Romanian (ISO 8859-16)", value: "iso885916", description: "iso885916" },
    { label: "Tajik (KOI8-T)", value: "koi8t", description: "koi8t" },
    { label: "Thai (Windows 874)", value: "windows874", description: "windows874" },
    { label: "Turkish (ISO 8859-9)", value: "iso88599", description: "iso88599" },
    { label: "Turkish (Windows 1254)", value: "windows1254", description: "windows1254" },
    { label: "Vietnamese (Windows 1258)", value: "windows1258", description: "windows1258" },
    { label: "Western (ISO 8859-1)", value: "iso88591", description: "iso88591" },
    { label: "Western (ISO 8859-15)", value: "iso885915", description: "iso885915" },
    { label: "Western (ISO 8859-3)", value: "iso88593", description: "iso88593" },
    { label: "Western (Windows 1252)", value: "windows1252", description: "windows1252" },
    { label: "Western European DOS (CP 850)", value: "cp850", description: "cp850" },
];
